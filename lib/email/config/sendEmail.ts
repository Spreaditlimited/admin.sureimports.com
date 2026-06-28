// sendEmail.ts
import transporter from '@/lib/email/config/nodemailerConfig';
import mailTemplate from '@/lib/email/temp/mailTemplate2';

const { SMTP_EMAIL } = process.env;
const STANDARD_EMAIL_TEMPLATE_MARKER = 'sureimports-standard-email-template';

function ensureStandardTemplate(subject: string, html: string) {
  if (html?.includes(STANDARD_EMAIL_TEMPLATE_MARKER)) {
    return html;
  }

  return mailTemplate({
    zTitle: subject,
    zBodyTitle: subject,
    zBody1: html || '',
    zBody2: '',
    zButtonTitle: '',
    zButtonLink: '',
  }) as string;
}


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
      html: ensureStandardTemplate(subject, html),
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
