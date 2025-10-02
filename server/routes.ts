import type { Express } from "express";
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

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Helper middleware to load user and tenant info
async function withUser(req: any, res: any, next: any) {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.tenantId) {
      return res.status(403).json({ message: "User needs to complete onboarding" });
    }

    req.dbUser = user;
    req.tenantId = user.tenantId;
    next();
  } catch (error) {
    console.error("Error loading user:", error);
    res.status(500).json({ message: "Failed to load user" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Auth Routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post("/api/auth/onboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Tenants
  app.get("/api/tenants/current", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const tenant = await storage.getTenant(req.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/tenants/current", isAuthenticated, withUser, async (req: any, res) => {
    try {
      // Only allow updating the logo field for security
      const validatedData = updateTenantLogoSchema.parse(req.body);
      const tenant = await storage.updateTenant(req.tenantId, validatedData);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // CSV Import & Templates
  app.post("/api/import/contacts", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const { csvContent } = req.body;
      if (!csvContent) {
        return res.status(400).json({ message: "CSV content is required" });
      }
      const result = await importContactsCSV(csvContent, req.tenantId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/import/properties", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const { csvContent } = req.body;
      if (!csvContent) {
        return res.status(400).json({ message: "CSV content is required" });
      }
      const result = await importPropertiesCSV(csvContent, req.tenantId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/import/payments", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const { csvContent } = req.body;
      if (!csvContent) {
        return res.status(400).json({ message: "CSV content is required" });
      }
      const result = await importPaymentsCSV(csvContent, req.tenantId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/import/contracts", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const { csvContent } = req.body;
      if (!csvContent) {
        return res.status(400).json({ message: "CSV content is required" });
      }
      const result = await importContractsCSV(csvContent, req.tenantId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/import/invoices", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const { csvContent } = req.body;
      if (!csvContent) {
        return res.status(400).json({ message: "CSV content is required" });
      }
      const result = await importInvoicesCSV(csvContent, req.tenantId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
  app.get("/api/contacts", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const contacts = await storage.getContacts(req.tenantId);
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/contacts", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const contactData = insertContactSchema.parse({
        ...req.body,
        tenantId: req.tenantId,
      });
      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/contacts/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const contact = await storage.getContact(req.params.id, req.tenantId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/contacts/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const contact = await storage.updateContact(req.params.id, req.tenantId, req.body);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/contacts/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      await storage.deleteContact(req.params.id, req.tenantId);
      res.json({ message: "Contact deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Properties
  app.get("/api/properties", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const properties = await storage.getProperties(req.tenantId);
      res.json(properties);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/properties", isAuthenticated, withUser, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/properties/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const property = await storage.getProperty(req.params.id, req.tenantId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/properties/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const property = await storage.updateProperty(req.params.id, req.tenantId, req.body);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      await storage.deleteProperty(req.params.id, req.tenantId);
      res.json({ message: "Property deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Contracts
  app.get("/api/contracts", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const contracts = await storage.getContracts(req.tenantId);
      res.json(contracts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/contracts", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const contractData = insertContractSchema.parse({
        ...req.body,
        tenantId: req.tenantId,
      });
      const contract = await storage.createContract(contractData);
      res.json(contract);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/contracts/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const contract = await storage.getContract(req.params.id, req.tenantId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/contracts/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const contract = await storage.updateContract(req.params.id, req.tenantId, req.body);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/contracts/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      await storage.deleteContract(req.params.id, req.tenantId);
      res.json({ message: "Contract deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/contracts/:id/policy", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { policyId } = req.body;

      // Get contract
      const contract = await storage.getContract(id, req.tenantId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // If policyId is provided, validate it
      if (policyId) {
        const policy = await storage.getPolicy(policyId, req.tenantId);
        if (!policy) {
          return res.status(404).json({ message: "Policy not found" });
        }

        // Validate policy belongs to same tenant
        if (policy.tenantId !== req.tenantId) {
          return res.status(403).json({ message: "Policy does not belong to your organization" });
        }

        // Validate policy is active
        if (policy.status !== 'active') {
          return res.status(400).json({ message: "Policy must be active to link to contract" });
        }

        // Check if policy end date covers contract start date (warning if not full coverage)
        const contractStartDate = new Date(contract.startDate);
        const contractEndDate = new Date(contract.endDate);
        const policyEndDate = new Date(policy.endDate);

        const warning = policyEndDate < contractEndDate 
          ? "La póliza vence antes que el contrato. Se recomienda renovar la póliza."
          : null;

        // Update contract with policy
        await storage.updateContract(id, req.tenantId, { policyId });

        return res.json({ 
          message: "Póliza vinculada exitosamente", 
          warning,
          policy 
        });
      } else {
        // Remove policy from contract
        await storage.updateContract(id, req.tenantId, { policyId: null });
        return res.json({ message: "Póliza desvinculada exitosamente" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/contracts/:id/activate", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.getContract(id, req.tenantId);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Check if tenant requires policy on activation
      const tenant = await storage.getTenant(req.tenantId);
      if (tenant?.requirePolicyOnActivation) {
        // Validate contract has a policy
        if (!contract.policyId) {
          return res.status(400).json({ 
            message: "No se puede activar el contrato sin una póliza vigente. Por favor vincule una póliza antes de activar." 
          });
        }

        // Validate policy is active
        const policy = await storage.getPolicy(contract.policyId, req.tenantId);
        if (!policy || policy.status !== 'active') {
          return res.status(400).json({ 
            message: "La póliza vinculada no está activa. Por favor vincule una póliza activa antes de activar el contrato." 
          });
        }

        // Check if policy covers contract start date
        const policyEndDate = new Date(policy.endDate);
        const contractStartDate = new Date(contract.startDate);
        if (policyEndDate < contractStartDate) {
          return res.status(400).json({ 
            message: "La póliza vinculada ya venció antes de la fecha de inicio del contrato. Por favor vincule una póliza vigente." 
          });
        }
      }

      const invoices = await createMonthlyInvoices(id);
      await storage.updateContractStatus(id, req.tenantId, "active");
      
      res.json({ message: "Contract activated", invoicesCreated: invoices.length, invoices });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Invoices
  app.get("/api/invoices", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const invoices = await storage.getInvoices(req.tenantId);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id, req.tenantId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices/:id/remind", isAuthenticated, withUser, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices/:id/recalc", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id, req.tenantId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const totals = await recalcInvoiceTotals(req.params.id);
      res.json({ message: "Invoice recalculated", totals });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/invoices/:id/pdf", isAuthenticated, withUser, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices", isAuthenticated, withUser, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      // Validate amounts if present
      if (req.body.subtotal && parseFloat(req.body.subtotal) < 0) {
        return res.status(400).json({ message: "Subtotal cannot be negative" });
      }
      if (req.body.tax && parseFloat(req.body.tax) < 0) {
        return res.status(400).json({ message: "Tax cannot be negative" });
      }
      if (req.body.otherCharges && parseFloat(req.body.otherCharges) < 0) {
        return res.status(400).json({ message: "Other charges cannot be negative" });
      }
      if (req.body.lateFee && parseFloat(req.body.lateFee) < 0) {
        return res.status(400).json({ message: "Late fee cannot be negative" });
      }
      if (req.body.totalAmount && parseFloat(req.body.totalAmount) < 0) {
        return res.status(400).json({ message: "Total amount cannot be negative" });
      }
      if (req.body.amountPaid && parseFloat(req.body.amountPaid) < 0) {
        return res.status(400).json({ message: "Amount paid cannot be negative" });
      }
      
      const invoice = await storage.updateInvoice(req.params.id, req.tenantId, req.body);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      await storage.deleteInvoice(req.params.id, req.tenantId);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payments
  app.get("/api/payments", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const payments = await storage.getPayments(req.tenantId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payments", isAuthenticated, withUser, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/payments/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const payment = await storage.getPayment(req.params.id, req.tenantId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/payments/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const existingPayment = await storage.getPayment(req.params.id, req.tenantId);
      if (!existingPayment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      
      // If amount is being updated, validate it doesn't exceed invoice balance
      if (req.body.amount) {
        const invoice = await storage.getInvoice(existingPayment.invoiceId, req.tenantId);
        if (!invoice) {
          return res.status(404).json({ message: "Factura no encontrada" });
        }
        
        const totalAmount = parseFloat(invoice.totalAmount);
        const alreadyPaid = parseFloat(invoice.amountPaid);
        const oldPaymentAmount = parseFloat(existingPayment.amount);
        const newPaymentAmount = parseFloat(req.body.amount);
        
        // Calculate balance considering we're replacing the old payment
        const balanceDue = totalAmount - alreadyPaid + oldPaymentAmount;
        
        if (newPaymentAmount > balanceDue) {
          return res.status(400).json({ 
            message: `El monto del pago ($${newPaymentAmount.toLocaleString()}) excede el saldo pendiente ($${balanceDue.toLocaleString()})` 
          });
        }
      }
      
      const payment = await storage.updatePayment(req.params.id, req.tenantId, req.body);
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/payments/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      await storage.deletePayment(req.params.id, req.tenantId);
      res.json({ message: "Payment deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Insurers
  app.get("/api/insurers", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const insurers = await storage.getInsurers(req.tenantId);
      res.json(insurers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/insurers", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const insurerData = insertInsurerSchema.parse({
        ...req.body,
        tenantId: req.tenantId,
      });
      const insurer = await storage.createInsurer(insurerData);
      res.json(insurer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/insurers/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const insurer = await storage.getInsurer(req.params.id, req.tenantId);
      if (!insurer) {
        return res.status(404).json({ message: "Insurer not found" });
      }
      res.json(insurer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/insurers/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const insurer = await storage.updateInsurer(req.params.id, req.tenantId, req.body);
      if (!insurer) {
        return res.status(404).json({ message: "Insurer not found" });
      }
      res.json(insurer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/insurers/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      await storage.deleteInsurer(req.params.id, req.tenantId);
      res.json({ message: "Insurer deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Policies
  app.get("/api/policies", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const policies = await storage.getPolicies(req.tenantId);
      res.json(policies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/policies", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const policyData = insertPolicySchema.parse({
        ...req.body,
        tenantId: req.tenantId,
      });
      const policy = await storage.createPolicy(policyData);
      res.json(policy);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/policies/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const policy = await storage.getPolicy(req.params.id, req.tenantId);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      res.json(policy);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/policies/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const policy = await storage.updatePolicy(req.params.id, req.tenantId, req.body);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }
      res.json(policy);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/policies/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
      await storage.deletePolicy(req.params.id, req.tenantId);
      res.json({ message: "Policy deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // OCR
  app.post("/api/ocr/process-invoice", isAuthenticated, withUser, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      const fileName = req.file.originalname;
      const mimeType = req.file.mimetype;

      const result = await processOCRAndSave(fileBuffer, req.tenantId, fileName, mimeType);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/ocr/logs", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const { status } = req.query;
      const logs = await storage.getOCRLogs(req.tenantId, status as string);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ocr/:id/approve", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const { invoiceId, description, amount } = req.body;
      await approveOCRAndCreateCharge(req.params.id, invoiceId, description, amount);
      res.json({ message: "OCR approved and charge created" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ocr/:id/create-invoice", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const { contractId } = req.body;
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe Billing
  app.post("/api/billing/create-checkout-session", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const { plan } = req.body;
      const user = req.dbUser;
      
      if (!user.email) {
        return res.status(400).json({ message: "User email required" });
      }

      const session = await createCheckoutSession(req.tenantId, plan, user.email);
      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
    } catch (error: any) {
      res.status(400).json({ message: `Webhook Error: ${error.message}` });
    }
  });

  app.post("/api/billing/customer-portal", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const tenant = await storage.getTenant(req.tenantId);
      
      if (!tenant?.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer found" });
      }

      const session = await createCustomerPortalSession(tenant.stripeCustomerId);
      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard Stats
  app.get("/api/dashboard/stats", isAuthenticated, withUser, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
