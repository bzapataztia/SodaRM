import { 
  TextractClient, 
  AnalyzeDocumentCommand,
  FeatureType 
} from "@aws-sdk/client-textract";
import { db } from "../db";
import { ocrLogs, invoiceCharges } from "@shared/schema";
import { recalcInvoiceTotals } from "./invoiceEngine";

const textract = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function processOCR(fileUrl: string, tenantId: string) {
  try {
    // Download file from storage
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: bytes,
      },
      FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES],
    });

    const result = await textract.send(command);
    
    // Extract key-value pairs and tables
    const extractedData = extractKeyValues(result);
    
    // Determine period, amount, and reference
    const period = extractPeriod(extractedData);
    const amount = extractAmount(extractedData);
    const reference = extractReference(extractedData);
    
    // Calculate confidence
    const confidence = calculateConfidence(result);

    const [ocrLog] = await db.insert(ocrLogs).values({
      tenantId,
      fileUrl,
      provider: 'textract',
      confidence: confidence.toFixed(2),
      status: confidence > 80 ? 'ok' : 'needs_review',
      rawJson: result,
      extractedPeriodStart: period?.start,
      extractedPeriodEnd: period?.end,
      extractedAmount: amount?.toString(),
      extractedReference: reference,
      message: confidence > 80 ? 'Procesado correctamente' : 'Requiere revisión manual',
    }).returning();

    return ocrLog;
  } catch (error: any) {
    console.error('OCR Error:', error);
    
    await db.insert(ocrLogs).values({
      tenantId,
      fileUrl,
      provider: 'textract',
      status: 'error',
      message: error.message,
    });

    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

export async function approveOCRAndCreateCharge(
  ocrLogId: string,
  invoiceId: string,
  description?: string
) {
  const ocrLog = await db.query.ocrLogs.findFirst({
    where: (ocrLogs, { eq }) => eq(ocrLogs.id, ocrLogId),
  });

  if (!ocrLog) {
    throw new Error('OCR log not found');
  }

  if (!ocrLog.extractedAmount) {
    throw new Error('No amount extracted from OCR');
  }

  await db.insert(invoiceCharges).values({
    invoiceId,
    description: description || `Cargo adicional - ${ocrLog.extractedReference || 'Servicios'}`,
    amount: ocrLog.extractedAmount,
  });

  await recalcInvoiceTotals(invoiceId);

  return { success: true };
}

function extractKeyValues(result: any) {
  const keyValues: Record<string, string> = {};
  
  if (!result.Blocks) return keyValues;

  for (const block of result.Blocks) {
    if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')) {
      const key = getBlockText(block, result.Blocks);
      const valueBlock = block.Relationships?.find((r: any) => r.Type === 'VALUE');
      
      if (valueBlock?.Ids?.[0]) {
        const value = getBlockText(
          result.Blocks.find((b: any) => b.Id === valueBlock.Ids[0]),
          result.Blocks
        );
        keyValues[key.toLowerCase()] = value;
      }
    }
  }

  return keyValues;
}

function getBlockText(block: any, allBlocks: any[]) {
  if (!block?.Relationships) return '';
  
  const childIds = block.Relationships.find((r: any) => r.Type === 'CHILD')?.Ids || [];
  return childIds
    .map((id: string) => allBlocks.find((b: any) => b.Id === id)?.Text || '')
    .join(' ');
}

function extractPeriod(data: Record<string, string>) {
  const periodKeys = ['periodo', 'period', 'mes', 'fecha'];
  
  for (const key of periodKeys) {
    for (const [k, v] of Object.entries(data)) {
      if (k.includes(key) && v) {
        // Try to parse date
        const dateMatch = v.match(/(\d{1,2})\/(\d{4})|(\w+)\s+(\d{4})/i);
        if (dateMatch) {
          // Simple parsing - enhance as needed
          return {
            start: new Date().toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0],
          };
        }
      }
    }
  }
  return null;
}

function extractAmount(data: Record<string, string>) {
  const amountKeys = ['total', 'valor', 'monto', 'amount', 'pagar'];
  
  for (const key of amountKeys) {
    for (const [k, v] of Object.entries(data)) {
      if (k.includes(key) && v) {
        const amountMatch = v.match(/[\d,]+\.?\d*/);
        if (amountMatch) {
          return parseFloat(amountMatch[0].replace(/,/g, ''));
        }
      }
    }
  }
  return null;
}

function extractReference(data: Record<string, string>) {
  const refKeys = ['referencia', 'ref', 'numero', 'number', 'nro'];
  
  for (const key of refKeys) {
    for (const [k, v] of Object.entries(data)) {
      if (k.includes(key) && v) {
        return v;
      }
    }
  }
  return null;
}

function calculateConfidence(result: any) {
  if (!result.Blocks) return 0;
  
  let totalConfidence = 0;
  let count = 0;
  
  for (const block of result.Blocks) {
    if (block.Confidence) {
      totalConfidence += block.Confidence;
      count++;
    }
  }
  
  return count > 0 ? totalConfidence / count : 0;
}
