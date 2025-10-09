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

const csvContractSchema = z.object({
  tenantId: z.string(),
  number: z.string().min(1),
  propertyId: z.string().min(1),
  ownerContactId: z.string().min(1),
  tenantContactId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  rentAmount: z.coerce.number().min(0),
  paymentDay: z.coerce.number().int().min(1).max(30),
  lateFeeType: z.enum(['none', 'fixed', 'percentage']).optional(),
  lateFeeValue: z.coerce.number().optional(),
  status: z.enum(['draft', 'active', 'expired', 'cancelled']).optional(),
  policyId: z.string().optional(),
});

const csvInvoiceSchema = z.object({
  tenantId: z.string(),
  number: z.string().min(1),
  contractId: z.string().min(1),
  tenantContactId: z.string().min(1),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  subtotal: z.coerce.number().min(0),
  tax: z.coerce.number().optional(),
  otherCharges: z.coerce.number().optional(),
  lateFee: z.coerce.number().optional(),
  totalAmount: z.coerce.number().min(0),
  amountPaid: z.coerce.number().optional(),
  status: z.enum(['draft', 'issued', 'paid', 'partial', 'overdue', 'cancelled']).optional(),
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

export async function importContractsCSV(csvContent: string, tenantId: string): Promise<CSVImportResult> {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const result: CSVImportResult = { success: 0, errors: [], total: records.length };

  for (let i = 0; i < records.length; i++) {
    const row = records[i] as any;
    try {
      const contractData = csvContractSchema.parse({
        tenantId,
        number: row.number,
        propertyId: row.propertyId || row.property_id,
        ownerContactId: row.ownerContactId || row.owner_contact_id,
        tenantContactId: row.tenantContactId || row.tenant_contact_id,
        startDate: row.startDate || row.start_date,
        endDate: row.endDate || row.end_date,
        rentAmount: row.rentAmount || row.rent_amount,
        paymentDay: row.paymentDay || row.payment_day,
        lateFeeType: row.lateFeeType || row.late_fee_type || 'none',
        lateFeeValue: row.lateFeeValue || row.late_fee_value || undefined,
        status: row.status || 'draft',
        policyId: row.policyId || row.policy_id || undefined,
      });
      
      await storage.createContract(contractData as any);
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

export async function importInvoicesCSV(csvContent: string, tenantId: string): Promise<CSVImportResult> {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const result: CSVImportResult = { success: 0, errors: [], total: records.length };

  for (let i = 0; i < records.length; i++) {
    const row = records[i] as any;
    try {
      const invoiceData = csvInvoiceSchema.parse({
        tenantId,
        number: row.number,
        contractId: row.contractId || row.contract_id,
        tenantContactId: row.tenantContactId || row.tenant_contact_id,
        issueDate: row.issueDate || row.issue_date,
        dueDate: row.dueDate || row.due_date,
        subtotal: row.subtotal,
        tax: row.tax || 0,
        otherCharges: row.otherCharges || row.other_charges || 0,
        lateFee: row.lateFee || row.late_fee || 0,
        totalAmount: row.totalAmount || row.total_amount,
        amountPaid: row.amountPaid || row.amount_paid || 0,
        status: row.status || 'draft',
      });
      
      await storage.createInvoice(invoiceData as any);
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

export function generateContractsTemplate(): string {
  const headers = ['number', 'propertyId', 'ownerContactId', 'tenantContactId', 'startDate', 'endDate', 'rentAmount', 'paymentDay', 'lateFeeType', 'lateFeeValue', 'status', 'policyId'];
  const example = [
    'CTR-001',
    'property-id-here',
    'owner-contact-id',
    'tenant-contact-id',
    '2024-01-01',
    '2025-01-01',
    '1500000',
    '5',
    'none',
    '0',
    'active',
    '',
  ];
  
  return `${headers.join(',')}\n${example.join(',')}\n`;
}

export function generateInvoicesTemplate(): string {
  const headers = ['number', 'contractId', 'tenantContactId', 'issueDate', 'dueDate', 'subtotal', 'tax', 'otherCharges', 'lateFee', 'totalAmount', 'amountPaid', 'status'];
  const example = [
    'INV-2024-001',
    'contract-id-here',
    'tenant-contact-id',
    '2024-01-01',
    '2024-01-05',
    '1500000',
    '0',
    '0',
    '0',
    '1500000',
    '0',
    'issued',
  ];
  
  return `${headers.join(',')}\n${example.join(',')}\n`;
}
