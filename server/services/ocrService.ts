import { createWorker, type Worker } from 'tesseract.js';
import { db } from "../db";
import { ocrLogs, invoiceCharges } from "@shared/schema";
import { recalcInvoiceTotals } from "./invoiceEngine";

interface OCRResult {
  rawText: string;
  parsedData: {
    provider?: string;
    total?: string;
    period?: string;
    consumption?: string;
    accountNumber?: string;
  };
  confidence: number;
}

let sharedWorker: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (!sharedWorker) {
    console.log('[OCR] Initializing Tesseract worker...');
    sharedWorker = await createWorker('spa', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    console.log('[OCR] Tesseract worker ready');
  }
  return sharedWorker;
}

export async function processInvoiceOCR(fileBuffer: Buffer, mimeType: string): Promise<OCRResult> {
  if (mimeType === 'application/pdf') {
    throw new Error('PDF files are not supported yet. Please upload an image file (JPG, PNG, etc.)');
  }

  if (!mimeType.startsWith('image/')) {
    throw new Error('Only image files are supported (JPG, PNG, GIF, etc.)');
  }

  const worker = await getWorker();
  
  const { data: { text, confidence } } = await worker.recognize(fileBuffer);
  
  const parsedData = parseUtilityBillData(text);
  
  return {
    rawText: text.trim(),
    parsedData,
    confidence: confidence || 0,
  };
}

export async function processOCRAndSave(
  fileBuffer: Buffer, 
  tenantId: string,
  fileName: string,
  mimeType: string
): Promise<any> {
  try {
    const ocrResult = await processInvoiceOCR(fileBuffer, mimeType);
    
    const confidenceLevel = ocrResult.confidence > 70 ? 'high' : 
                           ocrResult.confidence > 50 ? 'medium' : 'low';
    
    const status = ocrResult.confidence > 70 ? 'ok' : 'needs_review';
    
    const [ocrLog] = await db.insert(ocrLogs).values({
      tenantId,
      fileUrl: fileName,
      provider: 'tesseract',
      confidence: ocrResult.confidence.toFixed(2),
      status,
      rawJson: {
        rawText: ocrResult.rawText,
        parsedData: ocrResult.parsedData,
      },
      extractedAmount: ocrResult.parsedData.total || null,
      extractedReference: ocrResult.parsedData.accountNumber || null,
      message: status === 'ok' ? 'Procesado correctamente' : 'Requiere revisión manual',
    }).returning();

    return {
      ...ocrLog,
      parsedData: ocrResult.parsedData,
      rawText: ocrResult.rawText,
    };
  } catch (error: any) {
    console.error('[OCR] Error:', error);
    
    await db.insert(ocrLogs).values({
      tenantId,
      fileUrl: fileName,
      provider: 'tesseract',
      status: 'error',
      message: error.message,
    });

    throw error;
  }
}

export async function approveOCRAndCreateCharge(
  ocrLogId: string,
  invoiceId: string,
  description?: string,
  amount?: string
) {
  const ocrLog = await db.query.ocrLogs.findFirst({
    where: (ocrLogs, { eq }) => eq(ocrLogs.id, ocrLogId),
  });

  if (!ocrLog) {
    throw new Error('OCR log not found');
  }

  const chargeAmount = amount || ocrLog.extractedAmount;
  
  if (!chargeAmount) {
    throw new Error('No amount provided or extracted from OCR');
  }

  await db.insert(invoiceCharges).values({
    invoiceId,
    description: description || `Cargo adicional - ${ocrLog.extractedReference || 'Servicios'}`,
    amount: chargeAmount,
  });

  await recalcInvoiceTotals(invoiceId);

  return { success: true };
}

function parseUtilityBillData(text: string): OCRResult['parsedData'] {
  const data: OCRResult['parsedData'] = {};

  const providerPatterns = [
    /CFE|Comisi[oó]n Federal de Electricidad/i,
    /Aguascalientes|CCAPAMA/i,
    /Naturgy|Gas Natural/i,
    /Telmex|Telcel|Total Play/i,
    /Izzi|Megacable/i,
  ];

  for (const pattern of providerPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.provider = match[0];
      break;
    }
  }

  const totalPatterns = [
    /Total\s*a?\s*[Pp]agar\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
    /Total\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
    /Importe\s*[Tt]otal\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
  ];

  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.total = match[1].replace(',', '');
      break;
    }
  }

  const periodPattern = /[Pp]er[ií]odo\s*:?\s*(\d{2}[-\/]\d{2}[-\/]\d{2,4})\s*[-a]\s*(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i;
  const periodMatch = text.match(periodPattern);
  if (periodMatch) {
    data.period = `${periodMatch[1]} - ${periodMatch[2]}`;
  }

  const consumptionPatterns = [
    /Consumo\s*:?\s*(\d+)\s*kWh/i,
    /(\d+)\s*kWh/i,
    /Consumo\s*:?\s*(\d+)\s*m[3³]/i,
    /(\d+)\s*m[3³]/i,
  ];

  for (const pattern of consumptionPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.consumption = match[1];
      break;
    }
  }

  const accountPatterns = [
    /N[uú]mero\s*de\s*[Cc]uenta\s*:?\s*([\d\-]+)/i,
    /Cuenta\s*:?\s*([\d\-]+)/i,
    /N[uú]m\.\s*[Cc]liente\s*:?\s*([\d\-]+)/i,
  ];

  for (const pattern of accountPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.accountNumber = match[1];
      break;
    }
  }

  return data;
}
