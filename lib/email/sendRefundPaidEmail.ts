'use server';

import xMail from '@/lib/email/xMail2';

interface RefundPaidEmailData {
  userEmail: string;
  userName: string;
  pidRefund: string;
  pidOrder?: string | null;
  amount: number;
  currency?: string | null;
  serviceType?: string | null;
  reference?: string | null;
  paidAt: string;
}

export default async function sendRefundPaidEmail(
  data: RefundPaidEmailData
): Promise<boolean> {
  try {
    if (!data.userEmail || !data.userEmail.includes('@')) return false;

    const currency = data.currency || 'NGN';
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(data.amount);

    const table = `
<table style="width:100%;border-collapse:collapse;margin-top:6px;border:1px solid #e5e7eb;">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Refund ID</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${data.pidRefund}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Order ID</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${data.pidOrder || 'N/A'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Service</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${data.serviceType || 'Refund'}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Amount Paid</b></td><td style="padding:8px;border:1px solid #e5e7eb;"><b>${formattedAmount}</b></td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Reference</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${data.reference || data.pidRefund}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Paid At</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${data.paidAt}</td></tr>
</table>`;

    await xMail({
      xEmail: data.userEmail,
      xTitle: `Refund Paid - ${formattedAmount}`,
      xBodyTitle: 'Refund Payment Confirmed',
      xBody1: `Hello ${data.userName},<br />Your refund has been marked as paid.`,
      xBody2: `${table}<br />Thank you for using Sure Imports.`,
      xButtonTitle: 'View Refunds',
      xButtonLink: 'https://sureimports.com/dashboard/refunds',
    });

    return true;
  } catch (error) {
    console.error('Refund paid email failed:', error);
    return false;
  }
}
