import sendEmail from '@/lib/email/config/sendEmail';

export const CORPORATE_GIFT_STATUSES = [
  'Pending',
  'Invoiced',
  'Sourced',
  'Production Started',
  'Ready for Shipping',
  'Shipped',
  'Arrived',
  'Delivered',
] as const;

export type CorporateGiftStatus = (typeof CORPORATE_GIFT_STATUSES)[number];

export function getNextCorporateGiftStatus(
  currentStatus: string | null | undefined,
): CorporateGiftStatus | null {
  const current = currentStatus || CORPORATE_GIFT_STATUSES[0];
  const index = CORPORATE_GIFT_STATUSES.findIndex((status) => status === current);
  if (index === -1) return null;
  return CORPORATE_GIFT_STATUSES[index + 1] ?? null;
}

type NotifyInput = {
  requestId: string;
  businessName: string;
  contactPersonFullName: string;
  contactEmail: string;
  whatsappNumber: string;
  status: CorporateGiftStatus;
  handledByName?: string | null;
};

async function sendWhatsAppTemplate(input: NotifyInput) {
  const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;
  const webhookToken = process.env.N8N_WHATSAPP_WEBHOOK_TOKEN;

  if (!webhookUrl) {
    console.warn('n8n WhatsApp webhook is not configured');
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
    },
    body: JSON.stringify({
      channel: 'whatsapp',
      useTemplate: true,
      templateKey: 'corporate_gift_status_update',
      requestId: input.requestId,
      businessName: input.businessName,
      contactPersonFullName: input.contactPersonFullName,
      contactEmail: input.contactEmail,
      whatsappNumber: input.whatsappNumber,
      status: input.status,
      handledByName: input.handledByName || '',
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `n8n WhatsApp webhook error (${response.status}): ${errorText}`,
    );
  }
}

export async function notifyCustomerCorporateGiftStatus(input: NotifyInput) {
  const statusLine = `Current Status: ${input.status}`;
  const ownerLine = input.handledByName
    ? `Handled by: ${input.handledByName}`
    : '';

  const emailHtml = `
    <p>Hello ${input.contactPersonFullName || 'Customer'},</p>
    <p>We have an update on your corporate gift sourcing request.</p>
    <p><strong>Request ID:</strong> ${input.requestId}<br/>
    <strong>Business:</strong> ${input.businessName}<br/>
    <strong>${statusLine}</strong></p>
    ${ownerLine ? `<p>${ownerLine}</p>` : ''}
    <p>Thank you for choosing Sure Imports.</p>
  `;

  await Promise.allSettled([
    sendEmail(
      input.contactEmail,
      `Corporate Gift Request Update - ${input.requestId} (${input.status})`,
      emailHtml,
    ),
    sendWhatsAppTemplate(input),
  ]);
}
