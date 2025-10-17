import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, date, timestamp, boolean, pgEnum, json, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "collections"]);
export const planEnum = pgEnum("plan", ["trial", "starter", "growth", "pro"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["active", "paused", "cancelled"]);
export const propertyStatusEnum = pgEnum("property_status", ["available", "rented", "maintenance", "reserved"]);
export const contractStatusEnum = pgEnum("contract_status", ["draft", "signed", "active", "expiring", "expired", "closed"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "issued", "overdue", "partial", "paid"]);
export const policyStatusEnum = pgEnum("policy_status", ["active", "expired"]);
export const ocrStatusEnum = pgEnum("ocr_status", ["pending", "ok", "needs_review", "error"]);
export const lateFeeTypeEnum = pgEnum("late_fee_type", ["percent", "fixed", "none"]);

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Tenants (Organizations)
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logo: text("logo"),
  plan: planEnum("plan").notNull().default("trial"),
  maxProperties: integer("max_properties").notNull().default(10),
  status: tenantStatusEnum("status").notNull().default("active"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Users (adapted for Replit Auth + multi-tenant)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: userRoleEnum("role").notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Contacts (multi-role: owner, tenant, guarantor, provider)
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  roles: text("roles").array().notNull(), // ["owner", "tenant", "guarantor", "provider"]
  docType: text("doc_type"),
  docNumber: text("doc_number"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Properties
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  address: text("address"),
  stratum: integer("stratum"),
  type: text("type"),
  listRent: numeric("list_rent", { precision: 15, scale: 2 }),
  status: propertyStatusEnum("status").notNull().default("available"),
  ownerContactId: varchar("owner_contact_id").references(() => contacts.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniquePropertyCode: uniqueIndex("unique_property_code_per_tenant").on(table.tenantId, table.code),
}));

// Insurers
export const insurers = pgTable("insurers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  emailReports: text("email_reports"),
  policyType: text("policy_type"), // collective or individual
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Policies
export const policies = pgTable("policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  policyNumber: text("policy_number").notNull(),
  insurerId: varchar("insurer_id").notNull().references(() => insurers.id, { onDelete: "cascade" }),
  contractId: varchar("contract_id"),
  coverageType: text("coverage_type"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: policyStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniquePolicyNumber: uniqueIndex("unique_policy_number_per_tenant").on(table.tenantId, table.policyNumber),
}));

// Contracts
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  ownerContactId: varchar("owner_contact_id").notNull().references(() => contacts.id),
  tenantContactId: varchar("tenant_contact_id").notNull().references(() => contacts.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  rentAmount: numeric("rent_amount", { precision: 15, scale: 2 }).notNull(),
  paymentDay: integer("payment_day").notNull(), // 1-30
  lateFeeType: lateFeeTypeEnum("late_fee_type").notNull().default("none"),
  lateFeeValue: numeric("late_fee_value", { precision: 15, scale: 2 }),
  status: contractStatusEnum("status").notNull().default("draft"),
  policyId: varchar("policy_id").references(() => policies.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueContractNumber: uniqueIndex("unique_contract_number_per_tenant").on(table.tenantId, table.number),
}));

// Invoices
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  contractId: varchar("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  tenantContactId: varchar("tenant_contact_id").notNull().references(() => contacts.id),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 15, scale: 2 }).notNull().default("0"),
  otherCharges: numeric("other_charges", { precision: 15, scale: 2 }).notNull().default("0"),
  lateFee: numeric("late_fee", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueInvoiceNumber: uniqueIndex("unique_invoice_number_per_tenant").on(table.tenantId, table.number),
}));

// Invoice Charges (line items)
export const invoiceCharges = pgTable("invoice_charges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  method: text("method").notNull(),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// OCR Logs
export const ocrLogs = pgTable("ocr_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  provider: text("provider").notNull(), // textract or vision
  confidence: numeric("confidence", { precision: 5, scale: 2 }),
  status: ocrStatusEnum("status").notNull().default("pending"),
  rawJson: json("raw_json"),
  extractedPeriodStart: date("extracted_period_start"),
  extractedPeriodEnd: date("extracted_period_end"),
  extractedAmount: numeric("extracted_amount", { precision: 15, scale: 2 }),
  extractedReference: text("extracted_reference"),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  actorUserId: varchar("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: varchar("entity_id"),
  meta: json("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Property Photos
export const propertyPhotos = pgTable("property_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  contacts: many(contacts),
  properties: many(properties),
  contracts: many(contracts),
  invoices: many(invoices),
  payments: many(payments),
  insurers: many(insurers),
  policies: many(policies),
  ocrLogs: many(ocrLogs),
  auditLogs: many(auditLogs),
  propertyPhotos: many(propertyPhotos),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [contacts.tenantId],
    references: [tenants.id],
  }),
  ownedProperties: many(properties, { relationName: "propertyOwner" }),
  contractsAsOwner: many(contracts, { relationName: "contractOwner" }),
  contractsAsTenant: many(contracts, { relationName: "contractTenant" }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [properties.tenantId],
    references: [tenants.id],
  }),
  owner: one(contacts, {
    fields: [properties.ownerContactId],
    references: [contacts.id],
    relationName: "propertyOwner",
  }),
  contracts: many(contracts),
  photos: many(propertyPhotos),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [contracts.tenantId],
    references: [tenants.id],
  }),
  property: one(properties, {
    fields: [contracts.propertyId],
    references: [properties.id],
  }),
  owner: one(contacts, {
    fields: [contracts.ownerContactId],
    references: [contacts.id],
    relationName: "contractOwner",
  }),
  tenantContact: one(contacts, {
    fields: [contracts.tenantContactId],
    references: [contacts.id],
    relationName: "contractTenant",
  }),
  policy: one(policies, {
    fields: [contracts.policyId],
    references: [policies.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
  contract: one(contracts, {
    fields: [invoices.contractId],
    references: [contracts.id],
  }),
  tenantContact: one(contacts, {
    fields: [invoices.tenantContactId],
    references: [contacts.id],
  }),
  charges: many(invoiceCharges),
  payments: many(payments),
}));

export const invoiceChargesRelations = relations(invoiceCharges, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceCharges.invoiceId],
    references: [invoices.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const insurersRelations = relations(insurers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [insurers.tenantId],
    references: [tenants.id],
  }),
  policies: many(policies),
}));

export const policiesRelations = relations(policies, ({ one }) => ({
  tenant: one(tenants, {
    fields: [policies.tenantId],
    references: [tenants.id],
  }),
  insurer: one(insurers, {
    fields: [policies.insurerId],
    references: [insurers.id],
  }),
}));

export const propertyPhotosRelations = relations(propertyPhotos, ({ one }) => ({
  tenant: one(tenants, {
    fields: [propertyPhotos.tenantId],
    references: [tenants.id],
  }),
  property: one(properties, {
    fields: [propertyPhotos.propertyId],
    references: [properties.id],
  }),
}));

// Insert Schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export const updateTenantLogoSchema = z.object({
  logo: z.string().optional(),
}).strict();
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true });
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true });
export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertInvoiceChargeSchema = createInsertSchema(invoiceCharges).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertInsurerSchema = createInsertSchema(insurers).omit({ id: true, createdAt: true });
export const insertPolicySchema = createInsertSchema(policies).omit({ id: true, createdAt: true });
export const insertOcrLogSchema = createInsertSchema(ocrLogs).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertPropertyPhotoSchema = createInsertSchema(propertyPhotos).omit({ id: true, createdAt: true });

// Select Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceCharge = typeof invoiceCharges.$inferSelect;
export type InsertInvoiceCharge = z.infer<typeof insertInvoiceChargeSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Insurer = typeof insurers.$inferSelect;
export type InsertInsurer = z.infer<typeof insertInsurerSchema>;
export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = z.infer<typeof insertPolicySchema>;
export type OcrLog = typeof ocrLogs.$inferSelect;
export type InsertOcrLog = z.infer<typeof insertOcrLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type PropertyPhoto = typeof propertyPhotos.$inferSelect;
export type InsertPropertyPhoto = z.infer<typeof insertPropertyPhotoSchema>;
