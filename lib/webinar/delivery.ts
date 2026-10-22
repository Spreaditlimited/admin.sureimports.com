import { prisma } from '@/lib/prisma';
import transporter from '@/lib/email/config/nodemailerConfig';
import { renderMarketingEmail } from '@/lib/marketing/content';
import { createMarketingUnsubscribeUrl } from '@/lib/marketing/preferences';
import { hasConfirmedMarketingConsent } from '@/lib/marketing/brevoConsent';
import { webinarWelcome } from './content';

type Welcome = {
  email: string;
  pidUser: string | null;
  watched: number;
  welcomeStatus: string;
  sentAt: Date | null;
};
export async function getWelcome(email: string) {
  const rows = await prisma.$queryRaw<
    Welcome[]
  >`SELECT email, pidUser, watched, welcomeStatus, sentAt FROM webinar_welcomes WHERE email = ${email}`;
  return rows[0] || null;
}
export async function claimWelcome(email: string) {
  await prisma.$executeRaw`INSERT IGNORE INTO webinar_welcomes (email) VALUES (${email})`;
  const previous = await prisma.marketing_deliveries.findFirst({
    where: {
      recipientEmail: email,
      status: 'SENT',
      mode: 'PRODUCTION',
      sequenceStep: { pidStep: 'STEP-CHINA-IMPORT-00' },
    },
    orderBy: { sentAt: 'asc' },
    select: { sentAt: true },
  });
  if (previous?.sentAt) {
    await prisma.$executeRaw`UPDATE webinar_welcomes SET welcomeStatus = 'SENT', sentAt = ${previous.sentAt} WHERE email = ${email} AND welcomeStatus = 'PENDING'`;
    return false;
  }
  return (
    Number(
      await prisma.$executeRaw`UPDATE webinar_welcomes SET welcomeStatus = 'SENDING', claimedAt = NOW(3) WHERE email = ${email} AND welcomeStatus = 'PENDING'`,
    ) === 1
  );
}
export async function finishWelcome(email: string, sent: boolean) {
  await prisma.$executeRaw`UPDATE webinar_welcomes SET welcomeStatus = ${sent ? 'SENT' : 'REVIEW_REQUIRED'}, sentAt = ${sent ? new Date() : null} WHERE email = ${email} AND welcomeStatus = 'SENDING'`;
}
export async function welcomeContent(email: string, subscribed: boolean) {
  const row = await getWelcome(email);
  const user = row?.pidUser
    ? await prisma.users.findUnique({ where: { pidUser: row.pidUser } })
    : null;
  return webinarWelcome(
    user?.userCid === 'VERIFIED',
    Boolean(row?.watched),
    subscribed,
  );
}
// Uses the same claim as the marketing welcome. Unknown SMTP results require review,
// never an automatic resend that could deliver the introduction twice.
export async function processAccountWelcomes() {
  await prisma.$executeRaw`UPDATE webinar_welcomes SET welcomeStatus = 'REVIEW_REQUIRED' WHERE welcomeStatus = 'SENDING' AND claimedAt < DATE_SUB(NOW(), INTERVAL 20 MINUTE)`;
  const due = await prisma.$queryRaw<
    Array<{ email: string; pidUser: string }>
  >`SELECT w.email, w.pidUser FROM webinar_welcomes w JOIN users u ON u.pidUser = w.pidUser WHERE w.welcomeStatus = 'PENDING' AND w.accountCreatedAt < DATE_SUB(NOW(), INTERVAL 5 MINUTE) AND u.userCid = 'VERIFIED' AND (u.userStatus IS NULL OR u.userStatus = 'AL1') ORDER BY w.accountCreatedAt LIMIT 20`;
  let sent = 0;
  for (const item of due) {
    const contact = await prisma.marketing_contacts.findUnique({
      where: { email: item.email },
    });
    // A service welcome is not a subscription, but known delivery suppression still applies.
    if (contact?.bouncedAt || contact?.complainedAt) continue;
    if (!(await claimWelcome(item.email))) continue;
    try {
      const user = await prisma.users.findUniqueOrThrow({
        where: { pidUser: item.pidUser },
      });
      const subscribed = hasConfirmedMarketingConsent(contact);
      const content = await welcomeContent(item.email, subscribed);
      const rendered = renderMarketingEmail({
        ...content,
        bodyTitle: content.title,
        firstName: user.userFirstname,
        includeManagedUnsubscribe: subscribed,
        unsubscribeUrl:
          subscribed && contact
            ? createMarketingUnsubscribeUrl({
                email: item.email,
                pidContact: contact.pidContact,
              })
            : null,
      });
      await transporter.sendMail({
        from: `"Sure Imports" <${process.env.SMTP_EMAIL}>`,
        to: item.email,
        subject: content.subject,
        html: rendered.html,
        text: rendered.text,
      });
      await finishWelcome(item.email, true);
      sent++;
    } catch (error) {
      await finishWelcome(item.email, false);
      console.error('Account welcome requires delivery review', error);
    }
  }
  return { sent };
}
