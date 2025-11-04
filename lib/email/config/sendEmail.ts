// sendEmail.ts
import transporter from '@/lib/email/config/nodemailerConfig';

const { SMTP_EMAIL } = process.env;

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    console.log('📧 SMTP Configuration:', {
      from: `"Sure Imports" <${SMTP_EMAIL}>`,
      to,
      hasHTML: !!html,
      htmlLength: html?.length || 0,
    });

    const info = await transporter.sendMail({
      from: `"Sure Imports" <${SMTP_EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log('✅ Email sent successfully');
    console.log('📬 Message ID:', info.messageId);
    console.log('📨 Response:', info.response);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    if (error instanceof Error) {
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    throw error; // Re-throw to let caller handle it
  }
};

export default sendEmail;
