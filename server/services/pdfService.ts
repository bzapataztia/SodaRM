import { db } from "../db";
import { eq, and, gte, lte } from "drizzle-orm";
import { invoices, contracts, properties, contacts } from "@shared/schema";

export async function generateInsurerMonthlyReport(
  insurerId: string,
  year: number,
  month: number
): Promise<Buffer> {
  // Get all invoices for the period
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const invoicesList = await db.query.invoices.findMany({
    where: and(
      gte(invoices.issueDate, startDate),
      lte(invoices.issueDate, endDate)
    ),
    with: {
      contract: {
        with: {
          property: true,
          tenantContact: true,
          policy: true,
        },
      },
    },
  });

  // Filter by insurer through policy
  const filteredInvoices = invoicesList.filter(
    inv => inv.contract.policy?.insurerId === insurerId
  );

  // Generate HTML for PDF
  const html = generateReportHTML(filteredInvoices, year, month);

  // Convert HTML to PDF (using a simple library approach)
  // In production, you'd use puppeteer or similar
  const pdf = await htmlToPdf(html);

  return pdf;
}

function generateReportHTML(invoicesList: any[], year: number, month: number) {
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  let totalIssued = 0;
  let totalCollected = 0;
  let totalOverdue = 0;

  const rows = invoicesList.map(inv => {
    const total = parseFloat(inv.totalAmount);
    const paid = parseFloat(inv.amountPaid);
    
    totalIssued += total;
    totalCollected += paid;
    if (inv.status === 'overdue') {
      totalOverdue += (total - paid);
    }

    return `
      <tr>
        <td>${inv.number}</td>
        <td>${inv.contract.tenantContact.fullName}</td>
        <td>${inv.contract.property.name}</td>
        <td>${new Date(inv.issueDate).toLocaleDateString('es-ES')}</td>
        <td>${new Date(inv.dueDate).toLocaleDateString('es-ES')}</td>
        <td>$${total.toLocaleString('es-CO')}</td>
        <td>$${paid.toLocaleString('es-CO')}</td>
        <td>${inv.status}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; }
        h1 { color: #3B82F6; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #3B82F6; color: white; }
        .summary { margin: 20px 0; padding: 15px; background: #f0f9ff; }
      </style>
    </head>
    <body>
      <h1>Reporte Mensual de Cartera</h1>
      <p><strong>Período:</strong> ${monthNames[month - 1]} ${year}</p>
      
      <div class="summary">
        <h3>Resumen</h3>
        <p><strong>Total Emitido:</strong> $${totalIssued.toLocaleString('es-CO')}</p>
        <p><strong>Total Cobrado:</strong> $${totalCollected.toLocaleString('es-CO')}</p>
        <p><strong>Total Vencido:</strong> $${totalOverdue.toLocaleString('es-CO')}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Factura</th>
            <th>Inquilino</th>
            <th>Propiedad</th>
            <th>Emisión</th>
            <th>Vencimiento</th>
            <th>Total</th>
            <th>Pagado</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

async function htmlToPdf(html: string): Promise<Buffer> {
  // This is a placeholder - in production use puppeteer or similar
  // For now, return the HTML as a buffer (you'd implement actual PDF conversion)
  return Buffer.from(html, 'utf-8');
}
