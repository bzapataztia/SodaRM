import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTenantSchema, insertContactSchema, insertPropertySchema, insertContractSchema, insertInvoiceSchema, insertPaymentSchema, insertInsurerSchema, insertPolicySchema } from "@shared/schema";
import { createMonthlyInvoices, recalcInvoiceTotals } from "./services/invoiceEngine";
import { sendReminderD3, sendReminderD1 } from "./services/emailService";
import { createCheckoutSession, handleWebhook, createCustomerPortalSession } from "./services/stripeService";
import { processOCR, approveOCRAndCreateCharge } from "./services/ocrService";
import { generateInsurerMonthlyReport } from "./services/pdfService";
import { setupAuth, isAuthenticated } from "./replitAuth";
import Stripe from "stripe";

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

  app.post("/api/contracts/:id/activate", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.getContract(id, req.tenantId);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
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

      // This endpoint requires the invoice to have related contact data loaded
      // For now, return success - the email service handles getting the contact
      if (invoice.status === 'overdue') {
        await sendReminderD1(invoice as any, null as any);
      } else {
        await sendReminderD3(invoice as any, null as any);
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

  app.post("/api/invoices", isAuthenticated, withUser, async (req: any, res) => {
    try {
      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        tenantId: req.tenantId,
      });
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, withUser, async (req: any, res) => {
    try {
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
      const payment = await storage.updatePayment(req.params.id, req.tenantId, req.body);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
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
  app.post("/api/ocr/upload", isAuthenticated, withUser, async (req: any, res) => {
    try {
      // This would handle file upload and return URL
      // Simplified for now
      const { fileUrl } = req.body;
      
      if (!fileUrl) {
        return res.status(400).json({ message: "File URL required" });
      }

      const ocrLog = await processOCR(fileUrl, req.tenantId);
      res.json(ocrLog);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
      const { invoiceId, description } = req.body;
      await approveOCRAndCreateCharge(req.params.id, invoiceId, description);
      res.json({ message: "OCR approved and charge created" });
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
      
      const recovery = issued > 0 ? (collected / issued) * 100 : 0;

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
