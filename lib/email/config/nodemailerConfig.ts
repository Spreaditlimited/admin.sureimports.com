// emailConfig.ts
import nodemailer from 'nodemailer';

const { SMTP_EMAIL, SMTP_PASSWORD } = process.env;

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: SMTP_EMAIL,
    pass: SMTP_PASSWORD,
  },
});

// const transporter = nodemailer.createTransport({
//   host: 'smtp.sureimports.com',
//   port: 587,
//   secure: false,
//   auth: {
//     user: "hello@sureimports.com",
//     pass: "nofzu2-purquj-hevseQ",
//   },
//   connectionTimeout: 60000, // 60 seconds
// });

// const transporter = nodemailer.createTransport({
//   host: 'smtp.sureimports.com',
//   port: 587,
//   secure: false,
//   requireTLS: true,
//   auth: {
//     user: "hello@sureimports.com",
//     pass: "nofzu2-purquj-hevseQ",
//   },
// });

// const transporter = nodemailer.createTransport({
//   host: 'smtp.titan.email',
//   port: 465,
//   secure: true, // Use SSL/TLS
//   auth: {
//     user: "hello@sureimports.com",
//     pass: "nofzu2-purquj-hevseQ",
//   },
// });

// const transporter = nodemailer.createTransport({
//   host: 'smtp.sureimports.com', // e.g., smtp.yourdomain.com
//   port: 465, // Common ports: 587 (STARTTLS), 465 (SSL/TLS), 25 (non-secure, often blocked)
//   secure: false, // true for port 465, false for other ports
//   auth: {
//     user: "hello@sureimports.com", // Your SMTP username
//     pass: "nofzu2-purquj-hevseQ", // Your SMTP password
//   },
// });

// const transporter = nodemailer.createTransport({
//   service: 'Gmail',
//   auth: {
//     user: SMTP_EMAIL,
//     pass: SMTP_PASSWORD,
//   },
// });

export default transporter;
