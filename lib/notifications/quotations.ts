import xMail from '@/lib/email/xMail2';

type QuotationSentInput = {
  toEmail: string;
  customerName: string;
  quotationNumber: string;
  quotationTitle?: string | null;
  preparedAt: Date;
  pdfAttachment: {
    filename: string;
    content: Buffer;
  };
};

function escapeHtml(value: unknown) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendQuotationNotification(input: QuotationSentInput) {
  const preparedText = input.preparedAt.toLocaleDateString('en-NG', { dateStyle: 'medium' });
  const safeName = escapeHtml(input.customerName || 'Customer');
  const safeNumber = escapeHtml(input.quotationNumber);
  const safeTitle = escapeHtml(input.quotationTitle || 'Commercial quotation');

  await xMail({
    xEmail: input.toEmail,
    xTitle: `Quotation from Sure Imports - ${input.quotationNumber}`,
    xBodyTitle: `Quotation ${safeNumber}`,
    xBody1: `Hello ${safeName},<br />
Please find your Sure Imports quotation attached to this email for your review.`,
    xBody2: `<table style="width:100%;border-collapse:collapse;margin-top:4px;border:1px solid #e5e7eb;">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Quotation Number</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${safeNumber}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Quotation</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${safeTitle}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Prepared</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${preparedText}</td></tr>
</table><br />
If you would like to proceed or need any clarification, reply to this email or contact us via WhatsApp on +234 803 764 9956.`,
    attachments: [{ ...input.pdfAttachment, contentType: 'application/pdf' }],
    throwOnError: true,
  });
}
