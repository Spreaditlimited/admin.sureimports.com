import xMail from '@/lib/email/xMail2';

type InvoiceIssuedInput = {
  toEmail: string;
  customerName: string;
  invoiceNumber: string;
  currency: string;
  grandTotal: number;
  balanceDue: number;
  dueAt?: Date | null;
  issuedAt?: Date | null;
  headerSnapshot?: string | null;
  footerSnapshot?: string | null;
  invoiceLink?: string | null;
};

type ReceiptSentInput = {
  toEmail: string;
  customerName: string;
  receiptNumber: string;
  invoiceNumber: string;
  currency: string;
  amountReceived: number;
  totalPaid: number;
  balanceAfter: number;
  paymentMethod: string;
  paymentReference?: string | null;
  paidAt: Date;
  receiptLink?: string | null;
};

type InvoiceFollowUpInput = {
  toEmail: string;
  customerName: string;
  invoiceNumber: string;
  currency: string;
  balanceDue: number;
  dueAt?: Date | null;
  invoiceLink: string;
  followUpNumber: number;
};

export function getInvoiceFollowUpSubject(invoiceNumber: string, followUpNumber: number) {
  return followUpNumber === 1
    ? `Payment Reminder - Invoice ${invoiceNumber}`
    : `Payment Follow-up - Invoice ${invoiceNumber}`;
}

export async function sendInvoiceIssuedNotification(input: InvoiceIssuedInput) {
  const dueText = input.dueAt
    ? new Date(input.dueAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })
    : 'Not specified';
  const issuedText = input.issuedAt
    ? new Date(input.issuedAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })
    : new Date().toLocaleDateString('en-NG', { dateStyle: 'medium' });

  await xMail({
    xEmail: input.toEmail,
    xTitle: `Invoice Issued - ${input.invoiceNumber}`,
    xBodyTitle: `Invoice ${input.invoiceNumber}`,
    xBody1: `Hello ${input.customerName},<br />
Your invoice has been issued successfully. Please review the details below.`,
    xBody2: `<table style="width:100%;border-collapse:collapse;margin-top:4px;border:1px solid #e5e7eb;">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Invoice Number</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.invoiceNumber}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Issue Date</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${issuedText}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Due Date</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${dueText}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Total Amount</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.currency} ${input.grandTotal.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Balance Due</b></td><td style="padding:8px;border:1px solid #e5e7eb;"><b>${input.currency} ${input.balanceDue.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td></tr>
</table>`,
    xButtonTitle: 'View Invoice',
    xButtonLink: input.invoiceLink || 'https://sureimports.com/dashboard',
  });
}

export async function sendInvoiceFollowUpNotification(input: InvoiceFollowUpInput) {
  const dueText = input.dueAt
    ? new Date(input.dueAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })
    : 'Not specified';
  const balanceText = `${input.currency} ${input.balanceDue.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  await xMail({
    xEmail: input.toEmail,
    xTitle: getInvoiceFollowUpSubject(input.invoiceNumber, input.followUpNumber),
    xBodyTitle: `Payment reminder for invoice ${input.invoiceNumber}`,
    xBody1: `Hello ${input.customerName},<br />
This is a reminder that invoice ${input.invoiceNumber} still has an outstanding balance of <b>${balanceText}</b>.`,
    xBody2: `<table style="width:100%;border-collapse:collapse;margin-top:4px;border:1px solid #e5e7eb;">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Invoice Number</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.invoiceNumber}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Balance Due</b></td><td style="padding:8px;border:1px solid #e5e7eb;"><b>${balanceText}</b></td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Due Date</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${dueText}</td></tr>
</table><br />
Please use the button below to review the invoice and submit your payment details if you have already paid. If payment has already been confirmed, no further action is needed.`,
    xButtonTitle: 'View Invoice',
    xButtonLink: input.invoiceLink,
  });
}

export async function sendReceiptNotification(input: ReceiptSentInput) {
  await xMail({
    xEmail: input.toEmail,
    xTitle: `Payment Receipt - ${input.receiptNumber}`,
    xBodyTitle: `Receipt ${input.receiptNumber}`,
    xBody1: `Hello ${input.customerName},<br />
We have received your payment successfully.`,
    xBody2: `<table style="width:100%;border-collapse:collapse;margin-top:4px;border:1px solid #e5e7eb;">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Receipt Number</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.receiptNumber}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Invoice Number</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.invoiceNumber}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Amount Received</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.currency} ${input.amountReceived.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Total Paid</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.currency} ${input.totalPaid.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Balance Due</b></td><td style="padding:8px;border:1px solid #e5e7eb;"><b>${input.currency} ${input.balanceAfter.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Payment Method</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.paymentMethod}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Reference</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.paymentReference || 'N/A'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Paid At</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${new Date(input.paidAt).toLocaleString('en-NG')}</td></tr>
</table><br />
Thank you for your patronage.`,
    xButtonTitle: input.receiptLink ? 'Download Receipt (PDF)' : undefined,
    xButtonLink: input.receiptLink || undefined,
  });
}
