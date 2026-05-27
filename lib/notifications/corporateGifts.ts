import xMail from '@/lib/email/xMail2';

export const CORPORATE_GIFT_STATUSES = [
  'Pending',
  'Sourced',
  'Invoiced',
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
  const bodyTable = `
<table style="width:100%;border-collapse:collapse;margin-top:6px;border:1px solid #e5e7eb;">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Request ID</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.requestId}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Business</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.businessName}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Current Status</b></td><td style="padding:8px;border:1px solid #e5e7eb;"><b>${input.status}</b></td></tr>
</table>`;

  await Promise.allSettled([
    xMail({
      xEmail: input.contactEmail,
      xTitle: `Corporate Gift Request Update - ${input.requestId} (${input.status})`,
      xBodyTitle: 'Corporate Gift Status Update',
      xBody1: `Hello ${input.contactPersonFullName || 'Customer'},<br />We have an update on your corporate gift sourcing request.`,
      xBody2: `${bodyTable}<br />Thank you for choosing Sure Imports.`,
      xButtonTitle: 'Contact Us',
      xButtonLink: 'https://sureimports.com/contact',
    }),
    sendWhatsAppTemplate(input),
  ]);
}
