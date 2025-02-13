// sendEmail.ts
import transporter from '@/lib/email/config/nodemailerConfig';

const { SMTP_EMAIL } = process.env;

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: `"Sure Imports" <${SMTP_EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export default sendEmail;
