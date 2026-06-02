import xMail from '@/lib/email/xMail2';
import { sendApprovedWhatsAppStatusTemplate } from '@/lib/notifications/whatsappTemplate';

export const CORPORATE_GIFT_STATUSES = [
  'Pending',
  'Sourced',
  'Invoiced',
  'Production Started',
  'Ready for Shipping',
  'Shipped',
  'Arrived',
  'Delivered',
  'Cancelled',
] as const;

export type CorporateGiftStatus = (typeof CORPORATE_GIFT_STATUSES)[number];

export function getNextCorporateGiftStatus(
  currentStatus: string | null | undefined,
): CorporateGiftStatus | null {
  const progressionStatuses = CORPORATE_GIFT_STATUSES.filter(
    (status) => status !== 'Cancelled',
  );
  const current = currentStatus || progressionStatuses[0];
  const index = progressionStatuses.findIndex((status) => status === current);
  if (index === -1) return null;
  return (progressionStatuses[index + 1] as CorporateGiftStatus) ?? null;
}

type NotifyInput = {
  requestId: string;
  businessName: string;
  contactPersonFullName: string;
  contactEmail: string;
  whatsappNumber: string;
  status: CorporateGiftStatus;
  handledByName?: string | null;
  cancellationReason?: string | null;
};

async function sendWhatsAppTemplate(input: NotifyInput) {
  await sendApprovedWhatsAppStatusTemplate({
    ...input,
    serviceName: 'Corporate Gifts',
  });
}

export async function notifyCustomerCorporateGiftStatus(input: NotifyInput) {
  const bodyTable = `
<table style="width:100%;border-collapse:collapse;margin-top:6px;border:1px solid #e5e7eb;">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Request ID</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.requestId}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Business</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.businessName}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Current Status</b></td><td style="padding:8px;border:1px solid #e5e7eb;"><b>${input.status}</b></td></tr>
  ${input.status === 'Cancelled' ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Cancellation Reason</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.cancellationReason || 'Not provided'}</td></tr>` : ''}
</table>`;

  const introLine =
    input.status === 'Cancelled'
      ? `Hello ${input.contactPersonFullName || 'Customer'},<br />Your corporate gift sourcing request has been cancelled.`
      : `Hello ${input.contactPersonFullName || 'Customer'},<br />We have an update on your corporate gift sourcing request.`;

  await Promise.allSettled([
    xMail({
      xEmail: input.contactEmail,
      xTitle: `Corporate Gift Request Update - ${input.requestId} (${input.status})`,
      xBodyTitle: 'Corporate Gift Status Update',
      xBody1: introLine,
      xBody2: `${bodyTable}<br />Thank you for choosing Sure Imports.`,
      xButtonTitle: 'Contact Us',
      xButtonLink: 'https://sureimports.com/contact',
    }),
    sendWhatsAppTemplate(input),
  ]);
}
