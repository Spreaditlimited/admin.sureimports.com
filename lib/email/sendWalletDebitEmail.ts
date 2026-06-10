'use server';

import xMail from '@/lib/email/xMail2';

interface WalletDebitEmailData {
  userEmail: string;
  userName: string;
  amount: number;
  currency?: string | null;
  reason: string;
  reference: string;
  newBalance?: number | null;
  debitedAt: string;
}

export default async function sendWalletDebitEmail(
  data: WalletDebitEmailData
): Promise<boolean> {
  try {
    if (!data.userEmail || !data.userEmail.includes('@')) return false;

    const currency = data.currency || 'NGN';
    const formatAmount = (value: number) =>
      new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(value);

    const balanceRow =
      typeof data.newBalance === 'number'
        ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>New Wallet Balance</b></td><td style="padding:8px;border:1px solid #e5e7eb;"><b>${formatAmount(data.newBalance)}</b></td></tr>`
        : '';

    const table = `
<table style="width:100%;border-collapse:collapse;margin-top:6px;border:1px solid #e5e7eb;">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Amount Debited</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${formatAmount(data.amount)}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Reason</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${data.reason}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Reference</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${data.reference}</td></tr>
  ${balanceRow}
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Date</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${data.debitedAt}</td></tr>
</table>`;

    await xMail({
      xEmail: data.userEmail,
      xTitle: `Wallet Debit Notice - ${formatAmount(data.amount)}`,
      xBodyTitle: 'Wallet Debit Notice',
      xBody1: `Hello ${data.userName},<br />A debit has been applied to your Sure Imports wallet.`,
      xBody2: `${table}<br />If you need clarification on this debit, please contact Sure Imports support with the reference above.`,
      xButtonTitle: 'View Wallet',
      xButtonLink: 'https://sureimports.com/dashboard/wallet',
    });

    return true;
  } catch (error) {
    console.error('Wallet debit email failed:', error);
    return false;
  }
}
