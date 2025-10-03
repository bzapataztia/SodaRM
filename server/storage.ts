import { db } from "./db";
import { 
  users, tenants, contacts, properties, contracts, invoices, 
  invoiceCharges, payments, insurers, policies, ocrLogs, auditLogs,
  type User, type UpsertUser, type Tenant, type InsertTenant,
  type Contact, type InsertContact, type Property, type InsertProperty,
  type Contract, type InsertContract, type Invoice, type InsertInvoice,
  type Payment, type InsertPayment, type Insurer, type InsertInsurer,
  type Policy, type InsertPolicy
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users (Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  
  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  updateTenantPlan(id: string, plan: string, maxProperties: number): Promise<void>;
  
  // Contacts
  getContacts(tenantId: string): Promise<Contact[]>;
  getContact(id: string, tenantId: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, tenantId: string, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: string, tenantId: string): Promise<void>;
  
  // Properties
  getProperties(tenantId: string): Promise<Property[]>;
  getProperty(id: string, tenantId: string): Promise<Property | undefined>;
  getPropertiesCount(tenantId: string): Promise<number>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, tenantId: string, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string, tenantId: string): Promise<void>;
  
  // Contracts
  getContracts(tenantId: string): Promise<Contract[]>;
  getContract(id: string, tenantId: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, tenantId: string, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  updateContractStatus(id: string, tenantId: string, status: string): Promise<void>;
  deleteContract(id: string, tenantId: string): Promise<void>;
  
  // Invoices
  getInvoices(tenantId: string, filters?: any): Promise<Invoice[]>;
  getInvoice(id: string, tenantId: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, tenantId: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  updateInvoiceStatus(id: string, tenantId: string, status: string): Promise<void>;
  deleteInvoice(id: string, tenantId: string): Promise<void>;
  
  // Payments
  getPayments(tenantId: string): Promise<Payment[]>;
  getPayment(id: string, tenantId: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, tenantId: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: string, tenantId: string): Promise<void>;
  
  // Insurers & Policies
  getInsurers(tenantId: string): Promise<Insurer[]>;
  getInsurer(id: string, tenantId: string): Promise<Insurer | undefined>;
  createInsurer(insurer: InsertInsurer): Promise<Insurer>;
  updateInsurer(id: string, tenantId: string, insurer: Partial<InsertInsurer>): Promise<Insurer | undefined>;
  deleteInsurer(id: string, tenantId: string): Promise<void>;
  
  getPolicies(tenantId: string): Promise<Policy[]>;
  getPolicy(id: string, tenantId: string): Promise<Policy | undefined>;
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  updatePolicy(id: string, tenantId: string, policy: Partial<InsertPolicy>): Promise<Policy | undefined>;
  deletePolicy(id: string, tenantId: string): Promise<void>;
  getPoliciesWithOverdueInvoices(insurerId: string, tenantId: string): Promise<any[]>;
  
  // OCR
  getOCRLogs(tenantId: string, status?: string): Promise<any[]>;
}

// Helper function to sanitize update payloads
function sanitizeUpdate<T extends Record<string, any>>(data: T): Omit<T, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> {
  const { id, tenantId, createdAt, updatedAt, ...sanitized } = data;
  return sanitized;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    return user;
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    return await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    });
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants)
      .set(tenant)
      .where(eq(tenants.id, id))
      .returning();
    return updated;
  }

  async updateTenantPlan(id: string, plan: string, maxProperties: number): Promise<void> {
    await db.update(tenants)
      .set({ plan: plan as any, maxProperties })
      .where(eq(tenants.id, id));
  }

  async getContacts(tenantId: string): Promise<Contact[]> {
    return await db.query.contacts.findMany({
      where: eq(contacts.tenantId, tenantId),
      orderBy: [desc(contacts.createdAt)],
    });
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async getProperties(tenantId: string): Promise<Property[]> {
    return await db.query.properties.findMany({
      where: eq(properties.tenantId, tenantId),
      with: {
        owner: true,
      },
      orderBy: [desc(properties.createdAt)],
    });
  }

  async getPropertiesCount(tenantId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(eq(properties.tenantId, tenantId));
    return result[0]?.count || 0;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property).returning();
    return newProperty;
  }

  async getContracts(tenantId: string): Promise<Contract[]> {
    return await db.query.contracts.findMany({
      where: eq(contracts.tenantId, tenantId),
      with: {
        property: true,
        tenantContact: true,
        owner: true,
        policy: true,
      },
      orderBy: [desc(contracts.createdAt)],
    });
  }

  async getContract(id: string, tenantId: string): Promise<Contract | undefined> {
    return await db.query.contracts.findFirst({
      where: and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)),
      with: {
        property: true,
        tenantContact: true,
        owner: true,
      },
    });
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db.insert(contracts).values(contract).returning();
    return newContract;
  }

  async updateContractStatus(id: string, tenantId: string, status: string): Promise<void> {
    await db.update(contracts)
      .set({ status: status as any })
      .where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)));
  }

  async getInvoices(tenantId: string, filters?: any): Promise<Invoice[]> {
    return await db.query.invoices.findMany({
      where: eq(invoices.tenantId, tenantId),
      with: {
        contract: {
          with: {
            property: true,
          },
        },
        tenantContact: true,
        charges: true,
        payments: true,
      },
      orderBy: [desc(invoices.createdAt)],
    });
  }

  async getInvoice(id: string, tenantId: string): Promise<Invoice | undefined> {
    return await db.query.invoices.findFirst({
      where: and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)),
      with: {
        contract: {
          with: {
            property: true,
          },
        },
        tenantContact: true,
        charges: true,
        payments: true,
      },
    });
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoiceStatus(id: string, tenantId: string, status: string): Promise<void> {
    await db.update(invoices)
      .set({ status: status as any })
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
  }

  async getPayments(tenantId: string): Promise<Payment[]> {
    return await db.query.payments.findMany({
      where: eq(payments.tenantId, tenantId),
      with: {
        invoice: {
          with: {
            contract: {
              with: {
                property: true,
              },
            },
            tenantContact: true,
          },
        },
      },
      orderBy: [desc(payments.createdAt)],
    });
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    // Validate invoice belongs to same tenant before creating payment
    const invoice = await this.getInvoice(payment.invoiceId, payment.tenantId);
    if (!invoice) {
      throw new Error('Invoice not found or does not belong to this tenant');
    }
    
    const [newPayment] = await db.insert(payments).values(payment).returning();
    
    // Recalculate invoice amount paid and status
    const newAmountPaid = parseFloat(invoice.amountPaid) + parseFloat(payment.amount.toString());
    const total = parseFloat(invoice.totalAmount);
    
    let newStatus: any = 'partial';
    if (newAmountPaid >= total) {
      newStatus = 'paid';
    } else if (newAmountPaid <= 0) {
      newStatus = 'issued';
    }
    
    await db.update(invoices)
      .set({ 
        amountPaid: newAmountPaid.toFixed(2),
        status: newStatus,
      })
      .where(and(eq(invoices.id, payment.invoiceId), eq(invoices.tenantId, payment.tenantId)));
    
    return newPayment;
  }

  async getInsurers(tenantId: string): Promise<Insurer[]> {
    return await db.query.insurers.findMany({
      where: eq(insurers.tenantId, tenantId),
      orderBy: [desc(insurers.createdAt)],
    });
  }

  async createInsurer(insurer: InsertInsurer): Promise<Insurer> {
    const [newInsurer] = await db.insert(insurers).values(insurer).returning();
    return newInsurer;
  }

  async getPolicies(tenantId: string): Promise<Policy[]> {
    return await db.query.policies.findMany({
      where: eq(policies.tenantId, tenantId),
      with: {
        insurer: true,
      },
      orderBy: [desc(policies.createdAt)],
    });
  }

  async createPolicy(policy: InsertPolicy): Promise<Policy> {
    const [newPolicy] = await db.insert(policies).values(policy).returning();
    return newPolicy;
  }

  async getOCRLogs(tenantId: string, status?: string): Promise<any[]> {
    const conditions = [eq(ocrLogs.tenantId, tenantId)];
    
    if (status) {
      conditions.push(eq(ocrLogs.status, status as any));
    }
    
    return await db.query.ocrLogs.findMany({
      where: and(...conditions),
      orderBy: [desc(ocrLogs.createdAt)],
    });
  }

  // Extended CRUD methods for Contacts
  async getContact(id: string, tenantId: string): Promise<Contact | undefined> {
    return await db.query.contacts.findFirst({
      where: and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)),
    });
  }

  async updateContact(id: string, tenantId: string, contact: Partial<InsertContact>): Promise<Contact | undefined> {
    const [updated] = await db.update(contacts)
      .set(sanitizeUpdate(contact))
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteContact(id: string, tenantId: string): Promise<void> {
    await db.delete(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)));
  }

  // Extended CRUD methods for Properties
  async getProperty(id: string, tenantId: string): Promise<Property | undefined> {
    return await db.query.properties.findFirst({
      where: and(eq(properties.id, id), eq(properties.tenantId, tenantId)),
      with: { owner: true },
    });
  }

  async updateProperty(id: string, tenantId: string, property: Partial<InsertProperty>): Promise<Property | undefined> {
    const [updated] = await db.update(properties)
      .set(sanitizeUpdate(property))
      .where(and(eq(properties.id, id), eq(properties.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteProperty(id: string, tenantId: string): Promise<void> {
    await db.delete(properties)
      .where(and(eq(properties.id, id), eq(properties.tenantId, tenantId)));
  }

  // Extended CRUD methods for Contracts
  async updateContract(id: string, tenantId: string, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updated] = await db.update(contracts)
      .set(sanitizeUpdate(contract))
      .where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteContract(id: string, tenantId: string): Promise<void> {
    await db.delete(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)));
  }

  // Extended CRUD methods for Invoices
  async updateInvoice(id: string, tenantId: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices)
      .set(sanitizeUpdate(invoice))
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteInvoice(id: string, tenantId: string): Promise<void> {
    await db.delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
  }

  // Extended CRUD methods for Payments
  async getPayment(id: string, tenantId: string): Promise<Payment | undefined> {
    return await db.query.payments.findFirst({
      where: and(eq(payments.id, id), eq(payments.tenantId, tenantId)),
      with: {
        invoice: {
          with: {
            contract: { with: { property: true } },
            tenantContact: true,
          },
        },
      },
    });
  }

  async updatePayment(id: string, tenantId: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    // Get current payment
    const currentPayment = await this.getPayment(id, tenantId);
    if (!currentPayment) {
      return undefined;
    }
    
    // If changing invoice, validate new invoice belongs to same tenant
    if (payment.invoiceId && payment.invoiceId !== currentPayment.invoiceId) {
      const newInvoice = await this.getInvoice(payment.invoiceId, tenantId);
      if (!newInvoice) {
        throw new Error('New invoice not found or does not belong to this tenant');
      }
    }
    
    // Update payment
    const [updated] = await db.update(payments)
      .set(sanitizeUpdate(payment))
      .where(and(eq(payments.id, id), eq(payments.tenantId, tenantId)))
      .returning();
    
    // Recalculate old invoice if invoice changed
    if (payment.invoiceId && payment.invoiceId !== currentPayment.invoiceId) {
      await this.recalculateInvoicePayments(currentPayment.invoiceId, tenantId);
    }
    
    // Recalculate current/new invoice
    const finalInvoiceId = payment.invoiceId || currentPayment.invoiceId;
    await this.recalculateInvoicePayments(finalInvoiceId, tenantId);
    
    return updated;
  }

  async deletePayment(id: string, tenantId: string): Promise<void> {
    // Get payment to recalculate invoice after delete
    const payment = await this.getPayment(id, tenantId);
    if (!payment) {
      return;
    }
    
    await db.delete(payments)
      .where(and(eq(payments.id, id), eq(payments.tenantId, tenantId)));
    
    // Recalculate invoice after payment deletion
    await this.recalculateInvoicePayments(payment.invoiceId, tenantId);
  }
  
  // Helper method to recalculate invoice payments
  private async recalculateInvoicePayments(invoiceId: string, tenantId: string): Promise<void> {
    const invoice = await this.getInvoice(invoiceId, tenantId);
    if (!invoice) {
      return;
    }
    
    // Calculate total from payments
    const invoicePayments = await db.query.payments.findMany({
      where: and(eq(payments.invoiceId, invoiceId), eq(payments.tenantId, tenantId)),
    });
    
    const totalPaid = invoicePayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    const total = parseFloat(invoice.totalAmount);
    
    let newStatus: any = 'issued';
    if (totalPaid >= total) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    }
    
    await db.update(invoices)
      .set({ 
        amountPaid: totalPaid.toFixed(2),
        status: newStatus,
      })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));
  }

  // Extended CRUD methods for Insurers
  async getInsurer(id: string, tenantId: string): Promise<Insurer | undefined> {
    return await db.query.insurers.findFirst({
      where: and(eq(insurers.id, id), eq(insurers.tenantId, tenantId)),
    });
  }

  async updateInsurer(id: string, tenantId: string, insurer: Partial<InsertInsurer>): Promise<Insurer | undefined> {
    const [updated] = await db.update(insurers)
      .set(sanitizeUpdate(insurer))
      .where(and(eq(insurers.id, id), eq(insurers.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteInsurer(id: string, tenantId: string): Promise<void> {
    await db.delete(insurers)
      .where(and(eq(insurers.id, id), eq(insurers.tenantId, tenantId)));
  }

  // Extended CRUD methods for Policies
  async getPolicy(id: string, tenantId: string): Promise<Policy | undefined> {
    return await db.query.policies.findFirst({
      where: and(eq(policies.id, id), eq(policies.tenantId, tenantId)),
      with: { insurer: true },
    });
  }

  async updatePolicy(id: string, tenantId: string, policy: Partial<InsertPolicy>): Promise<Policy | undefined> {
    const [updated] = await db.update(policies)
      .set(sanitizeUpdate(policy))
      .where(and(eq(policies.id, id), eq(policies.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deletePolicy(id: string, tenantId: string): Promise<void> {
    await db.delete(policies)
      .where(and(eq(policies.id, id), eq(policies.tenantId, tenantId)));
  }

  async getPoliciesWithOverdueInvoices(insurerId: string, tenantId: string): Promise<any[]> {
    const result = await db
      .select({
        policyId: policies.id,
        policyNumber: policies.policyNumber,
        coverageType: policies.coverageType,
        policyStatus: policies.status,
        contractId: contracts.id,
        contractNumber: contracts.number,
        invoiceId: invoices.id,
        invoiceNumber: invoices.number,
        invoiceDueDate: invoices.dueDate,
        invoiceTotal: invoices.totalAmount,
        invoiceAmountPaid: invoices.amountPaid,
        tenantContactId: contracts.tenantContactId,
      })
      .from(policies)
      .innerJoin(contracts, eq(contracts.policyId, policies.id))
      .innerJoin(invoices, eq(invoices.contractId, contracts.id))
      .where(
        and(
          eq(policies.insurerId, insurerId),
          eq(policies.tenantId, tenantId),
          eq(invoices.status, 'overdue')
        )
      )
      .orderBy(desc(invoices.dueDate));

    return result;
  }
}

export const storage = new DatabaseStorage();
