import { getUncachableSendGridClient } from "../sendgridClient";

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(template: EmailTemplate) {
  const { client, fromEmail } = await getUncachableSendGridClient();
  
  const msg = {
    to: template.to,
    from: fromEmail,
    subject: template.subject,
    html: template.html,
    text: template.text || template.subject,
  };

  try {
    await client.send(msg);
    return { success: true };
  } catch (error: any) {
    console.error('SendGrid Error:', error.response?.body || error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function sendReminderD3(invoice: any, contact: any) {
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('es-ES');
  
  return await sendEmail({
    to: contact.email,
    subject: `Recordatorio: Factura ${invoice.number} vence en 3 días`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Recordatorio de Pago</h2>
        <p>Estimado/a ${contact.fullName},</p>
        <p>Le recordamos que su factura <strong>${invoice.number}</strong> vence el <strong>${dueDate}</strong>.</p>
        <p><strong>Monto a pagar:</strong> $${parseFloat(invoice.totalAmount).toLocaleString('es-CO')}</p>
        <p>Por favor, realice el pago antes de la fecha de vencimiento para evitar cargos por mora.</p>
        <p>Gracias por su atención.</p>
      </div>
    `,
  });
}

export async function sendReminderD1(invoice: any, contact: any) {
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('es-ES');
  
  return await sendEmail({
    to: contact.email,
    subject: `URGENTE: Factura ${invoice.number} venció ayer`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Factura Vencida</h2>
        <p>Estimado/a ${contact.fullName},</p>
        <p>Su factura <strong>${invoice.number}</strong> venció el <strong>${dueDate}</strong>.</p>
        <p><strong>Monto a pagar:</strong> $${parseFloat(invoice.totalAmount).toLocaleString('es-CO')}</p>
        <p style="color: #EF4444;"><strong>Se han aplicado cargos por mora.</strong></p>
        <p>Por favor, realice el pago a la mayor brevedad posible.</p>
        <p>Gracias por su atención.</p>
      </div>
    `,
  });
}

export async function sendInsurerMonthlyReport(insurer: any, pdfBuffer: Buffer, period: string) {
  const { client, fromEmail } = await getUncachableSendGridClient();
  
  const msg = {
    to: insurer.emailReports,
    from: fromEmail,
    subject: `Reporte Mensual - ${period}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Reporte Mensual de Cartera</h2>
        <p>Estimados,</p>
        <p>Adjunto encontrará el reporte mensual de cartera correspondiente al período <strong>${period}</strong>.</p>
        <p>Gracias por su atención.</p>
      </div>
    `,
    attachments: [
      {
        content: pdfBuffer.toString('base64'),
        filename: `reporte-${insurer.name.toLowerCase().replace(/\s+/g, '-')}-${period}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ],
  };

  try {
    await client.send(msg);
    return { success: true };
  } catch (error: any) {
    console.error('SendGrid Error:', error.response?.body || error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
