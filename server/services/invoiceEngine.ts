import { db } from "../db";
import { contracts, invoices, invoiceCharges, insertInvoiceSchema, insertInvoiceChargeSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function createMonthlyInvoices(contractId: string) {
  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.id, contractId),
  });

  if (!contract) {
    throw new Error("Contract not found");
  }

  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);
  const createdInvoices = [];

  let currentDate = new Date(startDate);
  let invoiceNumber = 1;

  while (currentDate <= endDate) {
    const issueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), contract.paymentDay);
    
    // If payment day is beyond the month's days, use last day of month
    if (dueDate.getMonth() !== currentDate.getMonth()) {
      dueDate.setDate(0); // Last day of previous month
    }

    const invoiceData = {
      tenantId: contract.tenantId,
      number: `${contract.number}-${String(invoiceNumber).padStart(3, '0')}`,
      contractId: contract.id,
      tenantContactId: contract.tenantContactId,
      issueDate: issueDate.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      subtotal: contract.rentAmount.toString(),
      tax: "0",
      otherCharges: "0",
      lateFee: "0",
      totalAmount: contract.rentAmount.toString(),
      amountPaid: "0",
      status: "issued" as const,
    };

    const [newInvoice] = await db.insert(invoices).values(invoiceData).returning();
    
    // Create default charge for rent
    await db.insert(invoiceCharges).values({
      invoiceId: newInvoice.id,
      description: `Canon de Arrendamiento - ${currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}`,
      amount: contract.rentAmount.toString(),
    });

    createdInvoices.push(newInvoice);
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
    invoiceNumber++;
  }

  return createdInvoices;
}

export async function applyLateFee(invoiceId: string) {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      contract: true,
    },
  });

  if (!invoice || !invoice.contract) {
    throw new Error("Invoice or contract not found");
  }

  const contract = invoice.contract;
  let lateFeeAmount = 0;

  if (contract.lateFeeType === "percent" && contract.lateFeeValue) {
    const subtotal = parseFloat(invoice.subtotal);
    const percentage = parseFloat(contract.lateFeeValue);
    lateFeeAmount = subtotal * (percentage / 100);
  } else if (contract.lateFeeType === "fixed" && contract.lateFeeValue) {
    lateFeeAmount = parseFloat(contract.lateFeeValue);
  }

  if (lateFeeAmount > 0) {
    const newLateFee = lateFeeAmount.toFixed(2);
    const newTotal = (parseFloat(invoice.subtotal) + parseFloat(invoice.tax) + parseFloat(invoice.otherCharges) + lateFeeAmount).toFixed(2);

    await db.update(invoices)
      .set({
        lateFee: newLateFee,
        totalAmount: newTotal,
        status: "overdue",
      })
      .where(eq(invoices.id, invoiceId));

    // Add late fee charge
    await db.insert(invoiceCharges).values({
      invoiceId: invoiceId,
      description: `Mora por pago tardío (${contract.lateFeeType === 'percent' ? contract.lateFeeValue + '%' : 'Monto fijo'})`,
      amount: newLateFee,
    });
  } else {
    await db.update(invoices)
      .set({ status: "overdue" })
      .where(eq(invoices.id, invoiceId));
  }

  return lateFeeAmount;
}

export async function recalcInvoiceTotals(invoiceId: string) {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      charges: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  let subtotal = 0;
  let lateFee = 0;

  for (const charge of invoice.charges) {
    const amount = parseFloat(charge.amount);
    if (charge.description.toLowerCase().includes('mora')) {
      lateFee += amount;
    } else {
      subtotal += amount;
    }
  }

  const total = subtotal + parseFloat(invoice.tax) + parseFloat(invoice.otherCharges) + lateFee;

  await db.update(invoices)
    .set({
      subtotal: subtotal.toFixed(2),
      lateFee: lateFee.toFixed(2),
      totalAmount: total.toFixed(2),
    })
    .where(eq(invoices.id, invoiceId));

  return { subtotal, lateFee, total };
}
