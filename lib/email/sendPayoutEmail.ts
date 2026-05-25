'use server';
import xMail from '@/lib/email/xMail2';

interface PayoutEmailData {
  userEmail: string;
  userName: string;
  originalAmount: number;
  serviceCharge: number;
  netAmount: number;
  recipientCode: string;
  transferCode: string;
  transactionDate: string;
}

/**
 * Send payout success notification email to user
 * @param data - Payout transaction details
 * @returns Promise<boolean> - true if email sent successfully, false otherwise
 */
export default async function sendPayoutEmail(data: PayoutEmailData): Promise<boolean> {
  try {
    console.log('🔄 Starting payout email sending process...');
    console.log('📧 Email data:', {
      userEmail: data.userEmail,
      userName: data.userName,
      transferCode: data.transferCode,
    });

    const {
      userEmail,
      userName,
      originalAmount,
      serviceCharge,
      netAmount,
      recipientCode,
      transferCode,
      transactionDate,
    } = data;

    // Validate email address
    if (!userEmail || !userEmail.includes('@')) {
      console.error('❌ Invalid email address:', userEmail);
      return false;
    }

    // Format the net amount for the subject line
    const formattedNetAmount = netAmount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const subject = `Payout Transfer Successful - ₦${formattedNetAmount} Sent to Your Bank Account`;
    console.log('📝 Email subject:', subject);

    const fmt = (value: number) =>
      `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const table = `
<table style="width:100%;border-collapse:collapse;margin-top:6px;border:1px solid #e5e7eb;">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Original Amount</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${fmt(originalAmount)}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Service Charge</b></td><td style="padding:8px;border:1px solid #e5e7eb;">-${fmt(serviceCharge)}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Net Amount Sent</b></td><td style="padding:8px;border:1px solid #e5e7eb;"><b>${fmt(netAmount)}</b></td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Recipient</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${recipientCode}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Transfer Reference</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${transferCode}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Transaction Date</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${transactionDate}</td></tr>
</table>`;

    await xMail({
      xEmail: userEmail,
      xTitle: subject,
      xBodyTitle: 'Payout Transfer Successful',
      xBody1: `Hello ${userName},<br />Your payout request has been processed successfully.`,
      xBody2: `${table}<br />If funds are not reflected within 24 hours, please contact support.`,
      xButtonTitle: 'View Dashboard',
      xButtonLink: 'https://sureimports.com/dashboard',
    });

    console.log(`✅ Payout email sent successfully to ${userEmail} (Transfer: ${transferCode})`);
    return true;
  } catch (error) {
    console.error('❌ Error sending payout email:', error);
    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    return false;
  }
}
