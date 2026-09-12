import 'server-only';
import { prisma } from '@/lib/prisma';
import transporter from '@/lib/email/config/nodemailerConfig';
import mailTemplate from '@/lib/email/temp/mailTemplate2';
import { PARTNER_EMAIL_MAX_ATTEMPTS, PARTNER_EMAIL_LEASE_MS, partnerEmailContent, partnerEmailRetryAt } from './email-policy';

type Event = { id: string; partnerId: string; action: string; emailStatus: string; emailAttempts: number; emailLockedAt: Date | null; emailNextAttemptAt: Date | null };

/** Same lease protocol as the partner retry worker, scoped to one committed event. */
export async function deliverPartnerEmails(eventId: string) {
  if (!eventId) throw new Error('A notification event is required.');
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) throw new Error('Partner email transport is unavailable.');
  const lockedAt = new Date();
  const event = await prisma.$transaction(async tx => {
    const [row] = await tx.$queryRaw<Event[]>`SELECT id, partnerId, action, emailStatus, emailAttempts, emailLockedAt, emailNextAttemptAt FROM procurement_partner_kyc_events WHERE id=${eventId} FOR UPDATE`;
    if (!row) return null;
    const stale = row.emailStatus === 'SENDING' && row.emailLockedAt && row.emailLockedAt.getTime() <= lockedAt.getTime() - PARTNER_EMAIL_LEASE_MS;
    if (row.emailAttempts >= PARTNER_EMAIL_MAX_ATTEMPTS) {
      if (stale) await tx.$executeRaw`UPDATE procurement_partner_kyc_events SET emailStatus='FAILED', emailFailureCode='DELIVERY_UNCERTAIN', emailLockedAt=NULL WHERE id=${eventId}`;
      return null;
    }
    if (!stale && (row.emailStatus !== 'QUEUED' || (row.emailNextAttemptAt && row.emailNextAttemptAt > lockedAt))) return null;
    const attempt = row.emailAttempts + 1;
    await tx.$executeRaw`UPDATE procurement_partner_kyc_events SET emailStatus='SENDING', emailLockedAt=${lockedAt}, emailAttempts=${attempt}, emailFailureCode=NULL WHERE id=${eventId}`;
    return { ...row, attempt };
  });
  if (!event) return { sent: 0, failed: 0 };
  try {
    const [owner] = await prisma.$queryRaw<Array<{ userEmail: string }>>`SELECT u.userEmail FROM procurement_partners p JOIN users u ON u.pidUser=p.ownerPidUser WHERE p.id=${event.partnerId} LIMIT 1`;
    if (!owner) throw new Error('Notification owner unavailable.');
    const { subject, message } = partnerEmailContent(event.action);
    const href = `${(process.env.PARTNER_APP_URL || 'https://partner.sureimports.com').replace(/\/$/, '')}/partners/dashboard#${event.action.startsWith('WALLET_') ? 'earnings' : 'verification'}`;
    const html = mailTemplate({ zTitle: subject, zBodyTitle: subject, zBody1: message, zBody2: 'For your privacy, read the full review in your account. Do not send identity documents by email.', zButtonTitle: event.action.startsWith('WALLET_') ? 'View your wallet' : 'View your application', zButtonLink: href }) as string;
    const info = await transporter.sendMail({
      from: `"Sure Imports" <${process.env.SMTP_EMAIL}>`, to: owner.userEmail, subject, html,
      text: `${subject}\n\n${message}\n\nView your application: ${href}\n\nDo not send identity documents by email.`,
      messageId: `<partner-kyc-${event.id}@sureimports.com>`,
    });
    if (!info.accepted?.length) throw new Error('SMTP did not accept recipient.');
    await prisma.$executeRaw`UPDATE procurement_partner_kyc_events SET emailStatus='SENT', emailSentAt=NOW(3), emailLockedAt=NULL, emailNextAttemptAt=NULL WHERE id=${eventId} AND emailStatus='SENDING' AND emailAttempts=${event.attempt} AND emailLockedAt=${lockedAt}`;
    return { sent: 1, failed: 0 };
  } catch {
    const status = event.attempt >= PARTNER_EMAIL_MAX_ATTEMPTS ? 'FAILED' : 'QUEUED';
    const retryAt = status === 'FAILED' ? null : partnerEmailRetryAt(event.attempt);
    await prisma.$executeRaw`UPDATE procurement_partner_kyc_events SET emailStatus=${status}, emailFailureCode='DELIVERY_FAILED', emailLockedAt=NULL, emailNextAttemptAt=${retryAt} WHERE id=${eventId} AND emailStatus='SENDING' AND emailAttempts=${event.attempt} AND emailLockedAt=${lockedAt}`;
    return { sent: 0, failed: 1 };
  }
}
