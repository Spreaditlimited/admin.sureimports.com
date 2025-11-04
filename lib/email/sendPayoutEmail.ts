'use server';
import sendEmail from '@/lib/email/config/sendEmail';
import payoutMailTemplate from '@/lib/email/temp/payoutMailTemplate';

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

    console.log('🎨 Generating email template...');
    const htmlContent = payoutMailTemplate({
      userName,
      originalAmount,
      serviceCharge,
      netAmount,
      recipientCode,
      transferCode,
      transactionDate,
    });

    console.log('📤 Sending email via SMTP...');
    await sendEmail(userEmail, subject, htmlContent);

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

