import type { Express } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { insertUserSchema, insertTenantSchema, insertContactSchema, insertPropertySchema, insertContractSchema, insertPaymentSchema, insertInsurerSchema, insertPolicySchema } from "@shared/schema";
import { createMonthlyInvoices, recalcInvoiceTotals } from "./services/invoiceEngine";
import { sendReminderD3, sendReminderD1 } from "./services/emailService";
import { createCheckoutSession, handleWebhook, createCustomerPortalSession } from "./services/stripeService";
import { processOCR, approveOCRAndCreateCharge } from "./services/ocrService";
import { generateInsurerMonthlyReport } from "./services/pdfService";
import Stripe from "stripe";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware to verify JWT
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, fullName, companyName } = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create tenant
      const tenant = await storage.createTenant({
        name: companyName || "My Company",
        plan: "trial",
        maxProperties: 10,
        status: "active",
      });

      // Create user
      const user = await storage.createUser({
        tenantId: tenant.id,
        email,
        password,
        fullName,
        role: "owner",
      });

      const token = jwt.sign({ 
        id: user.id, 
        email: user.email, 
        tenantId: tenant.id,
        role: user.role 
      }, JWT_SECRET, { expiresIn: '7d' });

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          fullName: user.fullName,
          role: user.role 
        },
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

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await storage.verifyPassword(user, password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const tenant = await storage.getTenant(user.tenantId);

      const token = jwt.sign({ 
        id: user.id, 
        email: user.email, 
        tenantId: user.tenantId,
        role: user.role 
      }, JWT_SECRET, { expiresIn: '7d' });

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          fullName: user.fullName,
          role: user.role 
        },
        tenant: {
          id: tenant?.id,
          name: tenant?.name,
          plan: tenant?.plan,
          maxProperties: tenant?.maxProperties,
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/me", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUserByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const tenant = await storage.getTenant(user.tenantId);
      const propertiesCount = await storage.getPropertiesCount(user.tenantId);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        tenant: {
          id: tenant?.id,
          name: tenant?.name,
          plan: tenant?.plan,
          maxProperties: tenant?.maxProperties,
          propertiesCount,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Contacts
  app.get("/api/contacts", authenticateToken, async (req: any, res) => {
    try {
      const contacts = await storage.getContacts(req.user.tenantId);
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/contacts", authenticateToken, async (req: any, res) => {
    try {
      const contactData = insertContactSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
      });
      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Properties
  app.get("/api/properties", authenticateToken, async (req: any, res) => {
    try {
      const properties = await storage.getProperties(req.user.tenantId);
      res.json(properties);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/properties", authenticateToken, async (req: any, res) => {
    try {
      const tenant = await storage.getTenant(req.user.tenantId);
      const currentCount = await storage.getPropertiesCount(req.user.tenantId);
      
      if (tenant && currentCount >= tenant.maxProperties) {
        return res.status(403).json({ message: "Property limit reached. Please upgrade your plan." });
      }

      const propertyData = insertPropertySchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
      });
      const property = await storage.createProperty(propertyData);
      res.json(property);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Contracts
  app.get("/api/contracts", authenticateToken, async (req: any, res) => {
    try {
      const contracts = await storage.getContracts(req.user.tenantId);
      res.json(contracts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/contracts", authenticateToken, async (req: any, res) => {
    try {
      const contractData = insertContractSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
      });
      const contract = await storage.createContract(contractData);
      res.json(contract);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/contracts/:id/activate", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.getContract(id);
      
      if (!contract || contract.tenantId !== req.user.tenantId) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const invoices = await createMonthlyInvoices(id);
      await storage.updateContractStatus(id, "active");
      
      res.json({ message: "Contract activated", invoicesCreated: invoices.length, invoices });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Invoices
  app.get("/api/invoices", authenticateToken, async (req: any, res) => {
    try {
      const invoices = await storage.getInvoices(req.user.tenantId);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/invoices/:id", authenticateToken, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      
      if (!invoice || invoice.tenantId !== req.user.tenantId) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices/:id/remind", authenticateToken, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      
      if (!invoice || invoice.tenantId !== req.user.tenantId) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const contact = invoice.tenantContact;
      
      if (invoice.status === 'overdue') {
        await sendReminderD1(invoice, contact);
      } else {
        await sendReminderD3(invoice, contact);
      }
      
      res.json({ message: "Reminder sent successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices/:id/recalc", authenticateToken, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      
      if (!invoice || invoice.tenantId !== req.user.tenantId) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const totals = await recalcInvoiceTotals(req.params.id);
      res.json({ message: "Invoice recalculated", totals });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payments
  app.get("/api/payments", authenticateToken, async (req: any, res) => {
    try {
      const payments = await storage.getPayments(req.user.tenantId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payments", authenticateToken, async (req: any, res) => {
    try {
      const paymentData = insertPaymentSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
      });
      const payment = await storage.createPayment(paymentData);
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Insurers
  app.get("/api/insurers", authenticateToken, async (req: any, res) => {
    try {
      const insurers = await storage.getInsurers(req.user.tenantId);
      res.json(insurers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/insurers", authenticateToken, async (req: any, res) => {
    try {
      const insurerData = insertInsurerSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
      });
      const insurer = await storage.createInsurer(insurerData);
      res.json(insurer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Policies
  app.get("/api/policies", authenticateToken, async (req: any, res) => {
    try {
      const policies = await storage.getPolicies(req.user.tenantId);
      res.json(policies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/policies", authenticateToken, async (req: any, res) => {
    try {
      const policyData = insertPolicySchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
      });
      const policy = await storage.createPolicy(policyData);
      res.json(policy);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // OCR
  app.post("/api/ocr/upload", authenticateToken, async (req: any, res) => {
    try {
      // This would handle file upload and return URL
      // Simplified for now
      const { fileUrl } = req.body;
      
      if (!fileUrl) {
        return res.status(400).json({ message: "File URL required" });
      }

      const ocrLog = await processOCR(fileUrl, req.user.tenantId);
      res.json(ocrLog);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/ocr/logs", authenticateToken, async (req: any, res) => {
    try {
      const { status } = req.query;
      const logs = await storage.getOCRLogs(req.user.tenantId, status as string);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ocr/:id/approve", authenticateToken, async (req: any, res) => {
    try {
      const { invoiceId, description } = req.body;
      await approveOCRAndCreateCharge(req.params.id, invoiceId, description);
      res.json({ message: "OCR approved and charge created" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe Billing
  app.post("/api/billing/create-checkout-session", authenticateToken, async (req: any, res) => {
    try {
      const { plan } = req.body;
      const user = await storage.getUserByEmail(req.user.email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const session = await createCheckoutSession(req.user.tenantId, plan, user.email);
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
        apiVersion: '2024-12-18.acacia',
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

  app.post("/api/billing/customer-portal", authenticateToken, async (req: any, res) => {
    try {
      const tenant = await storage.getTenant(req.user.tenantId);
      
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
  app.get("/api/dashboard/stats", authenticateToken, async (req: any, res) => {
    try {
      const invoices = await storage.getInvoices(req.user.tenantId);
      
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
