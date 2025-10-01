import { db } from "./db";
import { 
  users, tenants, contacts, properties, contracts, invoices, 
  invoiceCharges, payments, insurers, policies, ocrLogs, auditLogs,
  type User, type InsertUser, type Tenant, type InsertTenant,
  type Contact, type InsertContact, type Property, type InsertProperty,
  type Contract, type InsertContract, type Invoice, type InsertInvoice,
  type Payment, type InsertPayment, type Insurer, type InsertInsurer,
  type Policy, type InsertPolicy
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { password: string }): Promise<User>;
  verifyPassword(user: User, password: string): Promise<boolean>;
  
  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenantPlan(id: string, plan: string, maxProperties: number): Promise<void>;
  
  // Contacts
  getContacts(tenantId: string): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  
  // Properties
  getProperties(tenantId: string): Promise<Property[]>;
  getPropertiesCount(tenantId: string): Promise<number>;
  createProperty(property: InsertProperty): Promise<Property>;
  
  // Contracts
  getContracts(tenantId: string): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContractStatus(id: string, status: string): Promise<void>;
  
  // Invoices
  getInvoices(tenantId: string, filters?: any): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoiceStatus(id: string, status: string): Promise<void>;
  
  // Payments
  getPayments(tenantId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  
  // Insurers & Policies
  getInsurers(tenantId: string): Promise<Insurer[]>;
  createInsurer(insurer: InsertInsurer): Promise<Insurer>;
  getPolicies(tenantId: string): Promise<Policy[]>;
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  
  // OCR
  getOCRLogs(tenantId: string, status?: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    return user;
  }

  async createUser(insertUser: InsertUser & { password: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
    }).returning();
    
    return user;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
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

  async getContract(id: string): Promise<Contract | undefined> {
    return await db.query.contracts.findFirst({
      where: eq(contracts.id, id),
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

  async updateContractStatus(id: string, status: string): Promise<void> {
    await db.update(contracts)
      .set({ status: status as any })
      .where(eq(contracts.id, id));
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

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
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

  async updateInvoiceStatus(id: string, status: string): Promise<void> {
    await db.update(invoices)
      .set({ status: status as any })
      .where(eq(invoices.id, id));
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
    const [newPayment] = await db.insert(payments).values(payment).returning();
    
    // Update invoice amount paid
    const invoice = await this.getInvoice(payment.invoiceId);
    if (invoice) {
      const newAmountPaid = parseFloat(invoice.amountPaid) + parseFloat(payment.amount.toString());
      const total = parseFloat(invoice.totalAmount);
      
      let newStatus: any = 'partial';
      if (newAmountPaid >= total) {
        newStatus = 'paid';
      }
      
      await db.update(invoices)
        .set({ 
          amountPaid: newAmountPaid.toFixed(2),
          status: newStatus,
        })
        .where(eq(invoices.id, payment.invoiceId));
    }
    
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
}

export const storage = new DatabaseStorage();
