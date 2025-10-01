import { parse } from 'csv-parse/sync';
import { storage } from '../storage';
import { z } from 'zod';

// CSV-specific schemas with type coercion
const csvContactSchema = z.object({
  tenantId: z.string(),
  fullName: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  roles: z.array(z.string()).min(1),
  docType: z.string().optional(),
  docNumber: z.string().optional(),
});

const csvPropertySchema = z.object({
  tenantId: z.string(),
  code: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional(),
  stratum: z.coerce.number().int().optional(),
  type: z.string().optional(),
  listRent: z.coerce.number().optional(),
  status: z.enum(['available', 'rented', 'maintenance', 'reserved']).optional(),
  ownerContactId: z.string().optional(),
});

const csvPaymentSchema = z.object({
  tenantId: z.string(),
  invoiceId: z.string().min(1),
  amount: z.coerce.number().min(0),
  paymentDate: z.string().min(1),
  method: z.enum(['cash', 'transfer', 'check', 'card']).optional(),
  receiptUrl: z.string().optional(),
});

export interface CSVImportResult {
  success: number;
  errors: Array<{ row: number; error: string; data?: any }>;
  total: number;
}

export async function importContactsCSV(csvContent: string, tenantId: string): Promise<CSVImportResult> {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const result: CSVImportResult = { success: 0, errors: [], total: records.length };

  for (let i = 0; i < records.length; i++) {
    const row = records[i] as any;
    try {
      const roles = row.roles ? row.roles.split(';').map((r: string) => r.trim()) : [];
      
      const contactData = csvContactSchema.parse({
        tenantId,
        fullName: row.fullName || row.full_name || row.fullname,
        email: row.email || '',
        phone: row.phone || '',
        roles: roles.length > 0 ? roles : ['tenant'],
        docType: row.docType || row.doc_type || '',
        docNumber: row.docNumber || row.doc_number || '',
      });
      
      await storage.createContact(contactData as any);
      result.success++;
    } catch (error: any) {
      result.errors.push({
        row: i + 2, // +2 because CSV is 1-indexed and has header row
        error: error.message,
        data: row,
      });
    }
  }

  return result;
}

export async function importPropertiesCSV(csvContent: string, tenantId: string): Promise<CSVImportResult> {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const result: CSVImportResult = { success: 0, errors: [], total: records.length };

  // Check property quota before importing
  const tenant = await storage.getTenant(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  
  const currentPropertiesCount = await storage.getPropertiesCount(tenantId);
  const maxAllowed = tenant.maxProperties;

  for (let i = 0; i < records.length; i++) {
    const row = records[i] as any;
    try {
      // Check if importing this property would exceed quota
      if (currentPropertiesCount + result.success >= maxAllowed) {
        result.errors.push({
          row: i + 2,
          error: `Property quota exceeded. Plan allows ${maxAllowed} properties maximum.`,
          data: row,
        });
        continue;
      }

      const propertyData = csvPropertySchema.parse({
        tenantId,
        code: row.code,
        name: row.name,
        address: row.address || '',
        stratum: row.stratum || undefined,
        type: row.type || '',
        listRent: row.listRent || row.list_rent || undefined,
        status: row.status || 'available',
        ownerContactId: row.ownerContactId || row.owner_contact_id || '',
      });
      
      await storage.createProperty(propertyData as any);
      result.success++;
    } catch (error: any) {
      result.errors.push({
        row: i + 2,
        error: error.message,
        data: row,
      });
    }
  }

  return result;
}

export async function importPaymentsCSV(csvContent: string, tenantId: string): Promise<CSVImportResult> {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const result: CSVImportResult = { success: 0, errors: [], total: records.length };

  for (let i = 0; i < records.length; i++) {
    const row = records[i] as any;
    try {
      const paymentData = csvPaymentSchema.parse({
        tenantId,
        invoiceId: row.invoiceId || row.invoice_id,
        amount: row.amount,
        paymentDate: row.paymentDate || row.payment_date,
        method: row.method || row.paymentMethod || row.payment_method || 'transfer',
        receiptUrl: row.receiptUrl || row.receipt_url || '',
      });
      
      await storage.createPayment(paymentData as any);
      result.success++;
    } catch (error: any) {
      result.errors.push({
        row: i + 2,
        error: error.message,
        data: row,
      });
    }
  }

  return result;
}

// CSV Template Generators
export function generateContactsTemplate(): string {
  const headers = ['fullName', 'email', 'phone', 'roles', 'docType', 'docNumber'];
  const example = [
    'Juan Pérez',
    'juan@example.com',
    '3001234567',
    'tenant;owner',
    'CC',
    '123456789',
  ];
  
  return `${headers.join(',')}\n${example.join(',')}\n`;
}

export function generatePropertiesTemplate(): string {
  const headers = ['code', 'name', 'address', 'stratum', 'type', 'listRent', 'status', 'ownerContactId'];
  const example = [
    'PROP-001',
    'Apartamento Centro',
    'Calle 100 # 10-20',
    '4',
    'apartamento',
    '1500000',
    'available',
    '',
  ];
  
  return `${headers.join(',')}\n${example.join(',')}\n`;
}

export function generatePaymentsTemplate(): string {
  const headers = ['invoiceId', 'amount', 'paymentDate', 'method', 'receiptUrl'];
  const example = [
    'invoice-id-here',
    '1500000',
    '2024-01-15',
    'transfer',
    '',
  ];
  
  return `${headers.join(',')}\n${example.join(',')}\n`;
}
