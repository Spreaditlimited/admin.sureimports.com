import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

type Notice = {
  id: number;
  conversationId: string;
  audience: string;
  revision: number;
  attempts: number;
};
type Delivery = (notice: {
  to: string;
  subject: string;
  url: string;
  messageId: string;
}) => Promise<void>;
/** A leased outbox: message writes never wait for SMTP. Delivery is at least once. */
export async function deliverSupportNotifications(
  prisma: PrismaClient,
  deliver: Delivery,
  teamEmail = 'hello@sureimports.com',
) {
  let delivered = 0,
    skipped = 0,
    failed = 0;
  for (let index = 0; index < 20; index++) {
    const token = randomBytes(16).toString('hex');
    const notice = await prisma.$transaction(async (db) => {
      const [row] = await db.$queryRaw<
        Notice[]
      >`SELECT id, conversationId, audience, revision, attempts FROM support_notifications WHERE availableAt<=NOW(3) AND (leaseUntil IS NULL OR leaseUntil<NOW(3)) AND attempts<5 ORDER BY availableAt, id LIMIT 1 FOR UPDATE SKIP LOCKED`;
      if (!row) return null;
      await db.$executeRaw`UPDATE support_notifications SET leaseUntil=DATE_ADD(NOW(3), INTERVAL 5 MINUTE), leaseToken=${token}, attempts=attempts+1 WHERE id=${row.id}`;
      return row;
    });
    if (!notice) break;
    try {
      const [conversation] = await prisma.$queryRaw<
        Array<{
          customerId: string;
          ownerKind: string;
          brand: string;
          assignedTo: string | null;
        }>
      >`SELECT customerId, ownerKind, brand, assignedTo FROM support_conversations WHERE id=${notice.conversationId}`;
      let to: string | null = null;
      let recipients: string[] = [];
      if (conversation?.brand === 'SURE_IMPORTS') {
        if (notice.audience === 'TEAM') {
          const admins = await prisma.$queryRaw<
            Array<{ userEmail: string }>
          >`SELECT a.userEmail FROM admin a WHERE (${conversation.assignedTo} IS NULL OR a.pidUser=${conversation.assignedTo}) AND (a.userStatus IN ('superadmin','L1') OR EXISTS (SELECT 1 FROM admin_permissions p WHERE p.pidUser COLLATE utf8mb4_unicode_ci=a.pidUser COLLATE utf8mb4_unicode_ci AND p.serviceKey='customer_support' AND p.canView=TRUE AND p.canEdit=TRUE)) AND NOT EXISTS (SELECT 1 FROM support_reads r WHERE r.conversationId=${notice.conversationId} AND r.adminId=a.pidUser COLLATE utf8mb4_unicode_ci AND r.lastReadMessageId >= (SELECT COALESCE(MAX(m.id),0) FROM support_messages m WHERE m.conversationId=${notice.conversationId} AND m.authorKind!='AGENT' AND m.internal=FALSE))`;
          // The shared mailbox is only a fallback for an unassigned, unread chat.
          const read = await prisma.$queryRaw<Array<{ present: number }>>`
            SELECT 1 AS present FROM support_reads r
            WHERE r.conversationId=${notice.conversationId}
            AND r.lastReadMessageId >= (SELECT COALESCE(MAX(m.id),0) FROM support_messages m WHERE m.conversationId=${notice.conversationId} AND m.authorKind!='AGENT' AND m.internal=FALSE)
            LIMIT 1`;
          recipients = [
            ...new Set(
              [
                ...(!conversation.assignedTo && !read.length
                  ? [teamEmail]
                  : []),
                ...admins.map((a) => a.userEmail || ''),
              ]
                .map((email) => email.trim().toLowerCase())
                .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
            ),
          ];
        } else if (conversation.ownerKind === 'CUSTOMER') {
          const user = await prisma.users.findUnique({
            where: { pidUser: conversation.customerId },
            select: {
              userEmail: true,
              userCid: true,
              userStatus: true,
              loginStatus: true,
            },
          });
          if (
            user?.userCid === 'VERIFIED' &&
            (!user.userStatus || user.userStatus === 'AL1') &&
            !['TEMP_PASSWORD_UNUSED', 'TEMP_PASSWORD_USED'].includes(
              user.loginStatus || '',
            )
          )
            to = user.userEmail;
        }
      }
      if (to) recipients = [to];
      if (recipients.length) {
        let recipientFailed = false;
        for (const recipient of recipients) {
          try {
            const recipientHash = createHash('sha256')
              .update(recipient.toLowerCase())
              .digest('hex');
            const sent = await prisma.$queryRaw<
              Array<{ recipientHash: string }>
            >`SELECT recipientHash FROM support_email_receipts WHERE noticeId=${notice.id} AND revision=${notice.revision} AND recipientHash=${recipientHash}`;
            if (sent.length) continue;
            const team = notice.audience === 'TEAM';
            await deliver({
              to: recipient,
              subject: team
                ? 'A customer is waiting for support'
                : 'You have a reply from Sure Imports support',
              url: `https://${team ? 'admin.' : ''}sureimports.com/dashboard/support?conversation=${notice.conversationId}`,
              messageId: `<support-${notice.id}-${notice.revision}-${recipientHash.slice(0, 16)}@sureimports.com>`,
            });
            await prisma.$executeRaw`INSERT IGNORE INTO support_email_receipts (noticeId,revision,recipientHash) VALUES (${notice.id},${notice.revision},${recipientHash})`;
            delivered++;
          } catch {
            recipientFailed = true;
          }
        }
        if (recipientFailed) throw new Error('Recipient delivery failed');
      } else skipped++;
      // A reply arriving during delivery increments revision; retain it for the next run.
      await prisma.$executeRaw`DELETE FROM support_notifications WHERE id=${notice.id} AND revision=${notice.revision} AND leaseToken=${token}`;
      await prisma.$executeRaw`UPDATE support_notifications SET leaseUntil=NULL, leaseToken=NULL, attempts=0 WHERE id=${notice.id} AND leaseToken=${token}`;
    } catch {
      failed++;
      const delay = Math.min(3600, 60 * 2 ** notice.attempts);
      await prisma.$executeRaw`UPDATE support_notifications SET leaseUntil=NULL, leaseToken=NULL, availableAt=DATE_ADD(NOW(3), INTERVAL ${delay} SECOND) WHERE id=${notice.id} AND leaseToken=${token}`;
    }
  }
  return { delivered, skipped, failed };
}
