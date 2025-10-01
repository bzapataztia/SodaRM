import cron from 'node-cron';
import { db } from '../db';
import { invoices, contracts } from '@shared/schema';
import { eq, and, lte, gte } from 'drizzle-orm';
import { applyLateFee } from '../services/invoiceEngine';
import { sendReminderD3, sendReminderD1, sendInsurerMonthlyReport } from '../services/emailService';
import { generateInsurerMonthlyReport } from '../services/pdfService';

export function startScheduler() {
  // D-3 Reminders (08:00 daily)
  cron.schedule('0 8 * * *', async () => {
    console.log('Running D-3 reminders job...');
    
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const targetDate = threeDaysFromNow.toISOString().split('T')[0];

    const invoicesList = await db.query.invoices.findMany({
      where: and(
        eq(invoices.dueDate, targetDate),
        // status in (issued, partial)
      ),
      with: {
        tenantContact: true,
      },
    });

    for (const invoice of invoicesList) {
      if (invoice.status === 'issued' || invoice.status === 'partial') {
        try {
          await sendReminderD3(invoice, invoice.tenantContact);
          console.log(`D-3 reminder sent for invoice ${invoice.number}`);
        } catch (error) {
          console.error(`Failed to send D-3 reminder for ${invoice.number}:`, error);
        }
      }
    }
  });

  // D+1 Overdue & Late Fee (08:00 daily)
  cron.schedule('0 8 * * *', async () => {
    console.log('Running D+1 overdue job...');
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const targetDate = yesterday.toISOString().split('T')[0];

    const invoicesList = await db.query.invoices.findMany({
      where: and(
        eq(invoices.dueDate, targetDate),
      ),
      with: {
        tenantContact: true,
        contract: true,
      },
    });

    for (const invoice of invoicesList) {
      if (invoice.status !== 'paid') {
        try {
          // Apply late fee
          await applyLateFee(invoice.id);
          
          // Send D+1 reminder
          await sendReminderD1(invoice, invoice.tenantContact);
          
          console.log(`Late fee applied and D+1 reminder sent for invoice ${invoice.number}`);
        } catch (error) {
          console.error(`Failed to process overdue invoice ${invoice.number}:`, error);
        }
      }
    }
  });

  // Monthly Insurer Reports (Day 1, 07:00)
  cron.schedule('0 7 1 * *', async () => {
    console.log('Running monthly insurer reports job...');
    
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1;

    const insurersList = await db.query.insurers.findMany();

    for (const insurer of insurersList) {
      if (insurer.emailReports) {
        try {
          const pdfBuffer = await generateInsurerMonthlyReport(insurer.id, year, month);
          await sendInsurerMonthlyReport(
            insurer, 
            pdfBuffer, 
            `${year}-${String(month).padStart(2, '0')}`
          );
          console.log(`Monthly report sent to ${insurer.name}`);
        } catch (error) {
          console.error(`Failed to send report to ${insurer.name}:`, error);
        }
      }
    }
  });

  console.log('Scheduler started successfully');
}
