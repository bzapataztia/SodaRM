import type { Express, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { and, eq } from "drizzle-orm";
import { invoices, ocrLogs, insertTenantSchema, updateTenantLogoSchema, insertContactSchema, insertPropertySchema, insertContractSchema, insertInvoiceSchema, insertPaymentSchema, insertInsurerSchema, insertPolicySchema } from "@shared/schema";
import { createMonthlyInvoices, recalcInvoiceTotals } from "./services/invoiceEngine";
import { sendReminderD3, sendReminderD1 } from "./services/emailService";
import { createCheckoutSession, handleWebhook, createCustomerPortalSession } from "./services/stripeService";
import { processOCRAndSave, approveOCRAndCreateCharge } from "./services/ocrService";
import { generateInsurerMonthlyReport } from "./services/pdfService";
import { importContactsCSV, importPropertiesCSV, importPaymentsCSV, importContractsCSV, importInvoicesCSV, generateContactsTemplate, generatePropertiesTemplate, generatePaymentsTemplate, generateContractsTemplate, generateInvoicesTemplate } from "./services/csvService";
import { setupAuth, isAuthenticated } from "./replitAuth";
import Stripe from "stripe";
import multer from "multer";
import type { AuthenticatedRequest, TenantBoundRequest } from "./types/auth";
import type { z } from "zod";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

type CsvImportRequest = AuthenticatedRequest<ParamsDictionary, unknown, { csvContent?: string }>;
type OnboardRequest = AuthenticatedRequest<ParamsDictionary, unknown, { companyName?: string }>;
type PartialInsertContact = Partial<z.infer<typeof insertContactSchema>>;
type PartialInsertProperty = Partial<z.infer<typeof insertPropertySchema>>;
type PartialInsertContract = Partial<z.infer<typeof insertContractSchema>>;
type PartialInsertInvoice = Partial<z.infer<typeof insertInvoiceSchema>>;
type PartialInsertPayment = Partial<z.infer<typeof insertPaymentSchema>>;
type PartialInsertInsurer = Partial<z.infer<typeof insertInsurerSchema>>;
type PartialInsertPolicy = Partial<z.infer<typeof insertPolicySchema>>;
type OcrApproveBody = { invoiceId?: string; description?: string; amount?: string };
type OcrCreateInvoiceBody = { contractId?: string };
type BillingCheckoutBody = { plan?: string };

const updateContactSchema = insertContactSchema.omit({ tenantId: true }).partial();
const updatePropertySchema = insertPropertySchema.omit({ tenantId: true }).partial();
const updateContractSchema = insertContractSchema.omit({ tenantId: true }).partial();
const updateInvoiceSchema = insertInvoiceSchema.omit({ tenantId: true }).partial();
const updatePaymentSchema = insertPaymentSchema.omit({ tenantId: true }).partial();
const updateInsurerSchema = insertInsurerSchema.omit({ tenantId: true }).partial();
const updatePolicySchema = insertPolicySchema.omit({ tenantId: true }).partial();

// Helper middleware to load user and tenant info
const withUser: import("express").RequestHandler = async (
  req,
  res,
  next,
) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user?.claims.sub;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.tenantId) {
      return res.status(403).json({ message: "User needs to complete onboarding" });
    }

    authReq.dbUser = { ...user, tenantId: user.tenantId } as typeof user & { tenantId: string };
    authReq.tenantId = user.tenantId;
    next();
  } catch (error) {
    console.error("Error loading user:", error);
    res.status(500).json({ message: "Failed to load user" });
  }
};

function ensureTenantRequest<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = Record<string, unknown>,
  ReqQuery = ParsedQs,
>(
  req: AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response,
): req is TenantBoundRequest<P, ResBody, ReqBody, ReqQuery> {
  const { tenantId, dbUser } = req;
  if (typeof tenantId !== "string" || !dbUser || typeof dbUser.tenantId !== "string") {
    res.status(500).json({ message: "Tenant context not available" });
    return false;
  }
  return true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Auth Routes
  app.get('/api/auth/user', isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const userId = req.user?.claims.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let tenant = null;
      let propertiesCount = 0;
      
      if (user.tenantId) {
        tenant = await storage.getTenant(user.tenantId);
        propertiesCount = await storage.getPropertiesCount(user.tenantId);
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          role: user.role,
          needsOnboarding: !user.tenantId,
        },
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          plan: tenant.plan,
          maxProperties: tenant.maxProperties,
          propertiesCount,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Onboarding - Create or join tenant
  app.post("/api/auth/onboard", isAuthenticated, async (req: OnboardRequest, res) => {
    try {
      const userId = req.user?.claims.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { companyName } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.tenantId) {
        return res.status(400).json({ message: "User already has a tenant" });
      }

      // Create tenant
      const tenant = await storage.createTenant({
        name: companyName || "Mi Empresa",
        plan: "trial",
        maxProperties: 10,
        status: "active",
      });

      // Update user with tenant and make them owner
      await storage.upsertUser({
        id: userId,
        tenantId: tenant.id,
        role: "owner",
      });

      res.json({ 
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          plan: tenant.plan,
        }
      });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Tenants
  app.get("/api/tenants/current", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const tenant = await storage.getTenant(req.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.patch("/api/tenants/current", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      // Only allow updating the logo field for security
      const validatedData = updateTenantLogoSchema.parse(req.body);
      const tenant = await storage.updateTenant(req.tenantId, validatedData);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  // CSV Import & Templates
  app.post("/api/import/contacts", isAuthenticated, withUser, async (req: CsvImportRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const { csvContent } = req.body;
      if (typeof csvContent !== "string" || csvContent.trim().length === 0) {
        return res.status(400).json({ message: "CSV content is required" });
      }
      const result = await importContactsCSV(csvContent, req.tenantId);
      res.json(result);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/import/properties", isAuthenticated, withUser, async (req: CsvImportRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const { csvContent } = req.body;
      if (typeof csvContent !== "string" || csvContent.trim().length === 0) {
        return res.status(400).json({ message: "CSV content is required" });
      }
      const result = await importPropertiesCSV(csvContent, req.tenantId);
      res.json(result);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/import/payments", isAuthenticated, withUser, async (req: CsvImportRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const { csvContent } = req.body;
      if (typeof csvContent !== "string" || csvContent.trim().length === 0) {
        return res.status(400).json({ message: "CSV content is required" });
      }
      const result = await importPaymentsCSV(csvContent, req.tenantId);
      res.json(result);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/import/contracts", isAuthenticated, withUser, async (req: CsvImportRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const { csvContent } = req.body;
      if (typeof csvContent !== "string" || csvContent.trim().length === 0) {
        return res.status(400).json({ message: "CSV content is required" });
      }
      const result = await importContractsCSV(csvContent, req.tenantId);
      res.json(result);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/import/invoices", isAuthenticated, withUser, async (req: CsvImportRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const { csvContent } = req.body;
      if (typeof csvContent !== "string" || csvContent.trim().length === 0) {
        return res.status(400).json({ message: "CSV content is required" });
      }
      const result = await importInvoicesCSV(csvContent, req.tenantId);
      res.json(result);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.get("/api/templates/contacts.csv", (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_contactos.csv"');
    res.send(generateContactsTemplate());
  });

  app.get("/api/templates/properties.csv", (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_propiedades.csv"');
    res.send(generatePropertiesTemplate());
  });

  app.get("/api/templates/payments.csv", (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_pagos.csv"');
    res.send(generatePaymentsTemplate());
  });

  app.get("/api/templates/contracts.csv", (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_contratos.csv"');
    res.send(generateContractsTemplate());
  });

  app.get("/api/templates/invoices.csv", (req, res) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_facturas.csv"');
    res.send(generateInvoicesTemplate());
  });

  // Contacts
  app.get("/api/contacts", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const contacts = await storage.getContacts(req.tenantId);
      res.json(contacts);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/contacts", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const contactData = insertContactSchema.parse({
        ...req.body,
        tenantId: req.tenantId,
      });
      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.get("/api/contacts/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const contact = await storage.getContact(req.params.id, req.tenantId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.patch("/api/contacts/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest<ParamsDictionary, unknown, PartialInsertContact>, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const updateData = updateContactSchema.parse(req.body);
      const contact = await storage.updateContact(req.params.id, req.tenantId, updateData);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.delete("/api/contacts/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      await storage.deleteContact(req.params.id, req.tenantId);
      res.json({ message: "Contact deleted successfully" });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Properties
  app.get("/api/properties", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const properties = await storage.getProperties(req.tenantId);
      res.json(properties);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/properties", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const tenant = await storage.getTenant(req.tenantId);
      const currentCount = await storage.getPropertiesCount(req.tenantId);
      
      if (tenant && currentCount >= tenant.maxProperties) {
        return res.status(403).json({ message: "Property limit reached. Please upgrade your plan." });
      }

      const propertyData = insertPropertySchema.parse({
        ...req.body,
        tenantId: req.tenantId,
      });
      const property = await storage.createProperty(propertyData);
      res.json(property);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.get("/api/properties/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const property = await storage.getProperty(req.params.id, req.tenantId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.patch("/api/properties/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest<ParamsDictionary, unknown, PartialInsertProperty>, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const updateData = updatePropertySchema.parse(req.body);
      const property = await storage.updateProperty(req.params.id, req.tenantId, updateData);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      await storage.deleteProperty(req.params.id, req.tenantId);
      res.json({ message: "Property deleted successfully" });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Contracts
  app.get("/api/contracts", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const contracts = await storage.getContracts(req.tenantId);
      res.json(contracts);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/contracts", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const contractData = insertContractSchema.parse({
        ...req.body,
        tenantId: req.tenantId,
      });
      
      // Validate no active contracts for the same property with overlapping dates
      const existingContracts = await storage.getContractsByProperty(contractData.propertyId, req.tenantId);
      const activeStatuses = ['signed', 'active', 'expiring'];
      const newStart = new Date(contractData.startDate);
      const newEnd = new Date(contractData.endDate);
      
      for (const existing of existingContracts) {
        if (!activeStatuses.includes(existing.status)) continue;
        
        const existStart = new Date(existing.startDate);
        const existEnd = new Date(existing.endDate);
        
        // Check for date overlap
        if (newStart <= existEnd && newEnd >= existStart) {
          return res.status(400).json({ 
            message: `La propiedad ya tiene un contrato activo (${existing.number}) que se superpone con las fechas seleccionadas` 
          });
        }
      }
      
      const contract = await storage.createContract(contractData);
      res.json(contract);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.get("/api/contracts/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const contract = await storage.getContract(req.params.id, req.tenantId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.patch("/api/contracts/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest<ParamsDictionary, unknown, PartialInsertContract>, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const updateData = updateContractSchema.parse(req.body);
      // Get existing contract first
      const existingContract = await storage.getContract(req.params.id, req.tenantId);
      if (!existingContract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // If updating dates or property, validate no overlap
      if (updateData.startDate || updateData.endDate || updateData.propertyId) {
        const propertyId = updateData.propertyId || existingContract.propertyId;
        const startDate = updateData.startDate || existingContract.startDate;
        const endDate = updateData.endDate || existingContract.endDate;

        const contracts = await storage.getContractsByProperty(propertyId, req.tenantId);
        const activeStatuses = ['signed', 'active', 'expiring'];
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);
        
        for (const existing of contracts) {
          if (existing.id === req.params.id) continue; // Skip self
          if (!activeStatuses.includes(existing.status)) continue;
          
          const existStart = new Date(existing.startDate);
          const existEnd = new Date(existing.endDate);
          
          // Check for date overlap
          if (newStart <= existEnd && newEnd >= existStart) {
            return res.status(400).json({ 
              message: `La propiedad ya tiene un contrato activo (${existing.number}) que se superpone con las fechas seleccionadas` 
            });
          }
        }
      }

      const contract = await storage.updateContract(req.params.id, req.tenantId, updateData);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.delete("/api/contracts/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      await storage.deleteContract(req.params.id, req.tenantId);
      res.json({ message: "Contract deleted successfully" });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/contracts/:id/activate", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const { id } = req.params;
      const contract = await storage.getContract(id, req.tenantId);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const invoices = await createMonthlyInvoices(id);
      await storage.updateContractStatus(id, req.tenantId, "active");
      
      res.json({ message: "Contract activated", invoicesCreated: invoices.length, invoices });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Invoices
  app.get("/api/invoices", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const invoices = await storage.getInvoices(req.tenantId);
      res.json(invoices);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const invoice = await storage.getInvoice(req.params.id, req.tenantId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/invoices/:id/remind", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const invoice = await storage.getInvoice(req.params.id, req.tenantId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get tenant contact to send email
      const contact = await storage.getContact(invoice.tenantContactId, req.tenantId);
      
      if (!contact) {
        return res.status(404).json({ message: "Tenant contact not found" });
      }

      if (!contact.email) {
        return res.status(400).json({ message: "Tenant contact has no email address" });
      }

      if (invoice.status === 'overdue') {
        await sendReminderD1(invoice as any, contact as any);
      } else {
        await sendReminderD3(invoice as any, contact as any);
      }
      
      res.json({ message: "Reminder sent successfully" });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/invoices/:id/recalc", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const invoice = await storage.getInvoice(req.params.id, req.tenantId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const totals = await recalcInvoiceTotals(req.params.id);
      res.json({ message: "Invoice recalculated", totals });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.get("/api/invoices/:id/pdf", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      // Get invoice with all required relations for PDF generation
      const invoice = await db.query.invoices.findFirst({
        where: and(eq(invoices.id, req.params.id), eq(invoices.tenantId, req.tenantId)),
        with: {
          tenantContact: true,
          contract: {
            with: {
              property: true,
            },
          },
          charges: true,
        },
      });
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const { generateInvoicePDF } = await import('./services/pdfService');
      const pdfBuffer = await generateInvoicePDF(invoice);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.number}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/invoices", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        tenantId: req.tenantId,
      });
      
      // Ensure all amounts are positive
      if (parseFloat(invoiceData.subtotal) < 0 || 
          parseFloat(invoiceData.tax || '0') < 0 || 
          parseFloat(invoiceData.otherCharges || '0') < 0 || 
          parseFloat(invoiceData.lateFee || '0') < 0 || 
          parseFloat(invoiceData.totalAmount) < 0 || 
          parseFloat(invoiceData.amountPaid || '0') < 0) {
        return res.status(400).json({ message: "Invoice amounts cannot be negative" });
      }
      
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest<ParamsDictionary, unknown, PartialInsertInvoice>, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const updateData = updateInvoiceSchema.parse(req.body);
      // Validate amounts if present
      if (updateData.subtotal && parseFloat(updateData.subtotal) < 0) {
        return res.status(400).json({ message: "Subtotal cannot be negative" });
      }
      if (updateData.tax && parseFloat(updateData.tax) < 0) {
        return res.status(400).json({ message: "Tax cannot be negative" });
      }
      if (updateData.otherCharges && parseFloat(updateData.otherCharges) < 0) {
        return res.status(400).json({ message: "Other charges cannot be negative" });
      }
      if (updateData.lateFee && parseFloat(updateData.lateFee) < 0) {
        return res.status(400).json({ message: "Late fee cannot be negative" });
      }
      if (updateData.totalAmount && parseFloat(updateData.totalAmount) < 0) {
        return res.status(400).json({ message: "Total amount cannot be negative" });
      }
      if (updateData.amountPaid && parseFloat(updateData.amountPaid) < 0) {
        return res.status(400).json({ message: "Amount paid cannot be negative" });
      }

      const invoice = await storage.updateInvoice(req.params.id, req.tenantId, updateData);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      if (updateData.status === "paid") {
        await recalcInvoiceTotals(invoice.id);
      }

      res.json({ ...invoice, ...updateData });
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      await storage.deleteInvoice(req.params.id, req.tenantId);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Payments
  app.get("/api/payments", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const payments = await storage.getPayments(req.tenantId);
      res.json(payments);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/payments", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const paymentData = insertPaymentSchema.parse({
        ...req.body,
        tenantId: req.tenantId,
      });
      
      // Validate payment amount doesn't exceed invoice balance
      const invoice = await storage.getInvoice(paymentData.invoiceId, req.tenantId);
      if (!invoice) {
        return res.status(404).json({ message: "Factura no encontrada" });
      }
      
      const totalAmount = parseFloat(invoice.totalAmount);
      const alreadyPaid = parseFloat(invoice.amountPaid);
      const newPayment = parseFloat(paymentData.amount);
      const balanceDue = totalAmount - alreadyPaid;
      
      if (newPayment > balanceDue) {
        return res.status(400).json({ 
          message: `El monto del pago ($${newPayment.toLocaleString()}) excede el saldo pendiente ($${balanceDue.toLocaleString()})` 
        });
      }
      
      const payment = await storage.createPayment(paymentData);
      res.json(payment);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.get("/api/payments/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const payment = await storage.getPayment(req.params.id, req.tenantId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.patch("/api/payments/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest<ParamsDictionary, unknown, PartialInsertPayment>, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const existingPayment = await storage.getPayment(req.params.id, req.tenantId);
      if (!existingPayment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const updateData = updatePaymentSchema.parse(req.body);

      // If amount is being updated, validate it doesn't exceed invoice balance
      if (updateData.amount) {
        const invoice = await storage.getInvoice(existingPayment.invoiceId, req.tenantId);
        if (!invoice) {
          return res.status(404).json({ message: "Factura no encontrada" });
        }

        const totalAmount = parseFloat(invoice.totalAmount);
        const alreadyPaid = parseFloat(invoice.amountPaid);
        const oldPaymentAmount = parseFloat(existingPayment.amount);
        const newPaymentAmount = parseFloat(updateData.amount);

        // Calculate balance considering we're replacing the old payment
        const balanceDue = totalAmount - alreadyPaid + oldPaymentAmount;

        if (newPaymentAmount > balanceDue) {
          return res.status(400).json({ 
            message: `El monto del pago ($${newPaymentAmount.toLocaleString()}) excede el saldo pendiente ($${balanceDue.toLocaleString()})` 
          });
        }
      }

      const payment = await storage.updatePayment(req.params.id, req.tenantId, updateData);
      res.json(payment);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.delete("/api/payments/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      await storage.deletePayment(req.params.id, req.tenantId);
      res.json({ message: "Payment deleted successfully" });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Insurers
  app.get("/api/insurers", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const insurers = await storage.getInsurers(req.tenantId);
      res.json(insurers);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/insurers", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const insurerData = insertInsurerSchema.parse({
        ...req.body,
        tenantId: req.tenantId,
      });
      const insurer = await storage.createInsurer(insurerData);
      res.json(insurer);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.get("/api/insurers/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const insurer = await storage.getInsurer(req.params.id, req.tenantId);
      if (!insurer) {
        return res.status(404).json({ message: "Insurer not found" });
      }
      res.json(insurer);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.patch("/api/insurers/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest<ParamsDictionary, unknown, PartialInsertInsurer>, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const updateData = updateInsurerSchema.parse(req.body);
      const insurer = await storage.updateInsurer(req.params.id, req.tenantId, updateData);
      if (!insurer) {
        return res.status(404).json({ message: "Insurer not found" });
      }
      res.json(insurer);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.delete("/api/insurers/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      await storage.deleteInsurer(req.params.id, req.tenantId);
      res.json({ message: "Insurer deleted successfully" });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Policies
  app.get("/api/policies", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const policies = await storage.getPolicies(req.tenantId);
      res.json(policies);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/policies", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const policyData = insertPolicySchema.parse({
        ...req.body,
        tenantId: req.tenantId,
      });
      const policy = await storage.createPolicy(policyData);
      res.json(policy);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.get("/api/policies/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const policy = await storage.getPolicy(req.params.id, req.tenantId);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      res.json(policy);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.patch("/api/policies/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest<ParamsDictionary, unknown, PartialInsertPolicy>, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const updateData = updatePolicySchema.parse(req.body);
      const policy = await storage.updatePolicy(req.params.id, req.tenantId, updateData);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      res.json(policy);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.delete("/api/policies/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      await storage.deletePolicy(req.params.id, req.tenantId);
      res.json({ message: "Policy deleted successfully" });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Policies with overdue invoices report
  app.get("/api/insurers/:insurerId/overdue-policies-report", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const { insurerId } = req.params;
      const report = await storage.getPoliciesWithOverdueInvoices(insurerId, req.tenantId);
      res.json(report);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // OCR
  app.post("/api/ocr/process-invoice", isAuthenticated, withUser, upload.single('file'), async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      const fileName = req.file.originalname;
      const mimeType = req.file.mimetype;

      const result = await processOCRAndSave(fileBuffer, req.tenantId, fileName, mimeType);
      res.json(result);
    } catch (error: unknown) {
      res.status(400).json({ message: getErrorMessage(error) });
    }
  });

  app.get("/api/ocr/logs", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const { status } = req.query;
      const logs = await storage.getOCRLogs(req.tenantId, status as string);
      res.json(logs);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/ocr/:id/approve", isAuthenticated, withUser, async (req: AuthenticatedRequest<ParamsDictionary, unknown, OcrApproveBody>, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const { invoiceId, description, amount } = req.body;
      if (typeof invoiceId !== "string" || invoiceId.trim().length === 0) {
        return res.status(400).json({ message: "Invoice ID is required" });
      }

      const sanitizedAmount = typeof amount === "string" && amount.trim().length > 0 ? amount : undefined;
      const sanitizedDescription = typeof description === "string" && description.trim().length > 0 ? description : undefined;

      await approveOCRAndCreateCharge(req.params.id, invoiceId, sanitizedDescription, sanitizedAmount);
      res.json({ message: "OCR approved and charge created" });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/ocr/:id/create-invoice", isAuthenticated, withUser, async (req: AuthenticatedRequest<ParamsDictionary, unknown, OcrCreateInvoiceBody>, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const { contractId } = req.body;
      if (typeof contractId !== "string" || contractId.trim().length === 0) {
        return res.status(400).json({ message: "Contract ID is required" });
      }
      const ocrLogId = req.params.id;

      // Get OCR log to extract the amount
      const ocrLog = await db.query.ocrLogs.findFirst({
        where: (ocrLogs, { eq, and }) => and(
          eq(ocrLogs.id, ocrLogId),
          eq(ocrLogs.tenantId, req.tenantId)
        ),
      });

      if (!ocrLog) {
        return res.status(404).json({ message: "OCR log not found" });
      }

      if (!ocrLog.extractedAmount) {
        return res.status(400).json({ message: "No amount extracted from OCR" });
      }

      // Get contract to extract tenant contact
      const contract = await db.query.contracts.findFirst({
        where: (contracts, { eq, and }) => and(
          eq(contracts.id, contractId),
          eq(contracts.tenantId, req.tenantId)
        ),
      });

      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Generate invoice number using contract number + OCR + timestamp
      const timestamp = new Date().getTime().toString().slice(-6);
      const invoiceNumber = `${contract.number}-OCR-${timestamp}`;

      // Use today as issue date and +15 days as due date
      const issueDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create invoice with OCR data
      const invoiceData = {
        tenantId: req.tenantId,
        number: invoiceNumber,
        contractId: contract.id,
        tenantContactId: contract.tenantContactId,
        issueDate,
        dueDate,
        subtotal: ocrLog.extractedAmount,
        tax: "0",
        otherCharges: "0",
        lateFee: "0",
        totalAmount: ocrLog.extractedAmount,
        amountPaid: "0",
        status: "issued" as const,
      };

      const invoice = await storage.createInvoice(invoiceData);

      // Update OCR log status to ok
      await db.update(ocrLogs)
        .set({ status: 'ok', message: `Factura ${invoiceNumber} creada exitosamente` })
        .where(eq(ocrLogs.id, ocrLogId));

      res.json({ invoice, message: "Invoice created successfully" });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Stripe Billing
  app.post("/api/billing/create-checkout-session", isAuthenticated, withUser, async (req: AuthenticatedRequest<ParamsDictionary, unknown, BillingCheckoutBody>, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const { plan } = req.body;
      if (typeof plan !== "string" || plan.trim().length === 0) {
        return res.status(400).json({ message: "Plan is required" });
      }
      const normalizedPlan = plan.trim().toLowerCase();
      if (!['starter', 'growth', 'pro'].includes(normalizedPlan)) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }
      const selectedPlan = normalizedPlan as 'starter' | 'growth' | 'pro';
      const user = req.dbUser;

      if (!user.email) {
        return res.status(400).json({ message: "User email required" });
      }

      const session = await createCheckoutSession(req.tenantId, selectedPlan, user.email);
      res.json({ url: session.url });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/billing/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ message: 'Webhook signature missing' });
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2025-09-30.clover',
      });
      
      const event = stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      await handleWebhook(event, storage);
      
      res.json({ received: true });
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      res.status(400).json({ message: `Webhook Error: ${message}` });
    }
  });

  app.post("/api/billing/customer-portal", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const tenant = await storage.getTenant(req.tenantId);
      
      if (!tenant?.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer found" });
      }

      const session = await createCustomerPortalSession(tenant.stripeCustomerId);
      res.json({ url: session.url });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Dashboard Stats
  app.get("/api/dashboard/stats", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    try {
      const invoices = await storage.getInvoices(req.tenantId);
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const thisMonthInvoices = invoices.filter(inv => {
        const issueDate = new Date(inv.issueDate);
        return issueDate.getMonth() === currentMonth && issueDate.getFullYear() === currentYear;
      });

      const issued = thisMonthInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
      const collected = thisMonthInvoices.reduce((sum, inv) => sum + parseFloat(inv.amountPaid), 0);
      const overdue = invoices.filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) - parseFloat(inv.amountPaid)), 0);
      
      // Calculate recovery based on all invoices (issued and partial)
      const totalIssued = invoices
        .filter(inv => inv.status !== 'draft')
        .reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
      const totalCollected = invoices
        .filter(inv => inv.status !== 'draft')
        .reduce((sum, inv) => sum + parseFloat(inv.amountPaid), 0);
      
      const recovery = totalIssued > 0 ? (totalCollected / totalIssued) * 100 : 0;

      res.json({
        issued,
        collected,
        overdue,
        recovery: recovery.toFixed(1),
      });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Object Storage endpoints
  const { ObjectStorageService } = await import("./objectStorage");
  const objectStorageService = new ObjectStorageService();

  app.post("/api/object-storage/upload-url", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    try {
      const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
      res.json({ 
        url: uploadUrl,
        method: "PUT",
        headers: {}
      });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/object-storage/normalize-path", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { rawPath } = req.body;
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(rawPath as string);
      res.json({ normalizedPath });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Property Photos endpoints
  app.get("/api/properties/:id/photos", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    
    try {
      const photos = await storage.getPropertyPhotos(req.params.id, req.tenantId);
      res.json(photos);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.post("/api/properties/:id/photos", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    
    try {
      const { objectPath, caption } = req.body;
      
      // Check photo count limit (max 10 photos per property)
      const photoCount = await storage.getPropertyPhotosCount(req.params.id, req.tenantId);
      if (photoCount >= 10) {
        return res.status(400).json({ message: 'Máximo 10 fotos por propiedad' });
      }

      // Set ACL policy for the uploaded object (make it public)
      const aclPolicy: any = {
        owner: req.dbUser!.id,
        visibility: 'public',
      };
      
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath as string, aclPolicy);

      const photo = await storage.createPropertyPhoto({
        tenantId: req.tenantId,
        propertyId: req.params.id,
        objectPath: normalizedPath,
        caption: (caption && typeof caption === 'string') ? caption : null,
      });

      res.status(201).json(photo);
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.delete("/api/property-photos/:id", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    
    try {
      // Get the photo to delete the object from storage
      const photos = await storage.getPropertyPhotos("", req.tenantId);
      const photo = photos.find(p => p.id === req.params.id);
      
      if (photo) {
        try {
          await objectStorageService.deleteObject(photo.objectPath);
        } catch (err) {
          console.error("Error deleting object from storage:", err);
        }
      }

      await storage.deletePropertyPhoto(req.params.id, req.tenantId);
      res.status(204).send();
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  app.patch("/api/property-photos/reorder", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    if (!ensureTenantRequest(req, res)) {
      return;
    }
    
    try {
      const { photoOrders } = req.body as { photoOrders: { id: string; displayOrder: number }[] };
      
      // Update each photo's order
      for (const { id, displayOrder } of photoOrders) {
        await storage.updatePhotoOrder(id, displayOrder, req.tenantId);
      }

      res.status(200).json({ message: 'Orden actualizado exitosamente' });
    } catch (error: unknown) {
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  // Serve object files
  app.get("/objects/*", isAuthenticated, withUser, async (req: AuthenticatedRequest, res) => {
    try {
      const objectPath = req.path;
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      
      // Check access permission
      const canAccess = await objectStorageService.canAccessObjectEntity({
        userId: req.dbUser?.id,
        objectFile,
      });

      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      await objectStorageService.downloadObject(objectFile, res);
    } catch (error: unknown) {
      if (error instanceof (await import("./objectStorage")).ObjectNotFoundError) {
        return res.status(404).json({ message: "Object not found" });
      }
      res.status(500).json({ message: getErrorMessage(error) });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
