import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { SupportError } from './policy';
import { pushSubscriptionSchema, trustedPushEndpoint } from './push-policy';
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export function pushSubscriptions(db: PrismaClient) {
  return {
    async subscribe(adminId: string, input: unknown) {
      const subscription = pushSubscriptionSchema.parse(input);
      return db.$transaction(async (tx) => {
        // Serialize the ten-device limit per administrator.
        const admins = await tx.$queryRaw<
          Array<{ pidUser: string }>
        >`SELECT pidUser FROM admin WHERE pidUser=${adminId} FOR UPDATE`;
        if (!admins.length)
          throw new SupportError(403, 'Support access is required.');
        const endpointHash = hash(subscription.endpoint);
        const [existing] = await tx.$queryRaw<
          Array<{ id: string; adminId: string }>
        >`SELECT id,adminId FROM support_push_subscriptions WHERE endpointHash=${endpointHash} FOR UPDATE`;
        if (existing && existing.adminId !== adminId)
          throw new SupportError(
            409,
            'This browser is linked to another admin. Turn off its notifications first.',
          );
        const [count] = await tx.$queryRaw<
          Array<{ total: bigint }>
        >`SELECT COUNT(*) AS total FROM support_push_subscriptions WHERE adminId=${adminId} AND active=TRUE AND expiresAt>NOW(3) AND endpointHash<>${endpointHash}`;
        if (Number(count.total) >= 10)
          throw new SupportError(
            409,
            'The ten-device limit has been reached. Turn off notifications on an unused device.',
          );
        const id = existing?.id || randomBytes(16).toString('hex');
        await tx.$executeRaw`INSERT INTO support_push_subscriptions (id,adminId,endpointHash,endpoint,p256dh,auth,expiresAt) VALUES (${id},${adminId},${endpointHash},${subscription.endpoint},${subscription.keys.p256dh},${subscription.keys.auth},DATE_ADD(NOW(3),INTERVAL 90 DAY)) ON DUPLICATE KEY UPDATE p256dh=${subscription.keys.p256dh},auth=${subscription.keys.auth},active=TRUE,expiresAt=DATE_ADD(NOW(3),INTERVAL 90 DAY),updatedAt=NOW(3)`;
        return id;
      });
    },
    async status(adminId: string, endpoint: string) {
      const [row] = await db.$queryRaw<
        Array<{ id: string }>
      >`SELECT id FROM support_push_subscriptions WHERE adminId=${adminId} AND endpointHash=${hash(endpoint)} AND active=TRUE AND expiresAt>NOW(3)`;
      return Boolean(row);
    },
    async unsubscribe(adminId: string, endpoint: string) {
      await db.$executeRaw`DELETE FROM support_push_subscriptions WHERE adminId=${adminId} AND endpointHash=${hash(endpoint)}`;
    },
  };
}
type PushDelivery = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; url: string; tag: string },
) => Promise<unknown>;
export async function deliverAdminPush(
  db: PrismaClient,
  deliver: PushDelivery,
) {
  let delivered = 0,
    skipped = 0,
    failed = 0;
  for (let i = 0; i < 20; i++) {
    const token = randomBytes(16).toString('hex');
    const job = await db.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<
        Array<{
          id: number;
          conversationId: string;
          subscriptionId: string;
          revision: number;
          attempts: number;
        }>
      >`SELECT id,conversationId,subscriptionId,revision,attempts FROM support_push_deliveries WHERE availableAt<=NOW(3) AND (leaseUntil IS NULL OR leaseUntil<NOW(3)) AND attempts<5 ORDER BY availableAt,id LIMIT 1 FOR UPDATE SKIP LOCKED`;
      if (!row) return null;
      await tx.$executeRaw`UPDATE support_push_deliveries SET leaseToken=${token},leaseUntil=DATE_ADD(NOW(3),INTERVAL 5 MINUTE),attempts=attempts+1 WHERE id=${row.id}`;
      return row;
    });
    if (!job) break;
    try {
      // Resolve assignment and read state at delivery, so queued alerts follow claims and reads.
      const [subscription] = await db.$queryRaw<
        Array<{ endpoint: string; p256dh: string; auth: string }>
      >`SELECT s.endpoint,s.p256dh,s.auth FROM support_push_subscriptions s JOIN admin a ON a.pidUser COLLATE utf8mb4_unicode_ci=s.adminId JOIN support_conversations c ON c.id=${job.conversationId} WHERE (c.assignedTo IS NULL OR c.assignedTo=s.adminId) AND NOT EXISTS (SELECT 1 FROM support_reads r WHERE r.conversationId=c.id AND r.adminId=s.adminId AND r.lastReadMessageId >= (SELECT COALESCE(MAX(m.id),0) FROM support_messages m WHERE m.conversationId=c.id AND m.authorKind!='AGENT' AND m.internal=FALSE)) AND s.id=${job.subscriptionId} AND s.active=TRUE AND s.expiresAt>NOW(3) AND (a.userStatus IN ('superadmin','L1') OR EXISTS (SELECT 1 FROM admin_permissions p WHERE p.pidUser COLLATE utf8mb4_unicode_ci=a.pidUser COLLATE utf8mb4_unicode_ci AND p.serviceKey='customer_support' AND p.canView=TRUE))`;
      if (subscription && trustedPushEndpoint(subscription.endpoint)) {
        await deliver(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          {
            title: 'Sure Imports support',
            body: 'A customer is waiting for your reply. Open the inbox to view their message.',
            url: `/dashboard/support?conversation=${job.conversationId}`,
            tag: `support-${job.conversationId}`,
          },
        );
        delivered++;
      } else skipped++;
      await db.$executeRaw`DELETE FROM support_push_deliveries WHERE id=${job.id} AND revision=${job.revision} AND leaseToken=${token}`;
      await db.$executeRaw`UPDATE support_push_deliveries SET leaseUntil=NULL,leaseToken=NULL,attempts=0 WHERE id=${job.id} AND leaseToken=${token}`;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.$executeRaw`DELETE FROM support_push_subscriptions WHERE id=${job.subscriptionId}`;
        skipped++;
      } else {
        failed++;
        const delay = Math.min(3600, 60 * 2 ** job.attempts);
        await db.$executeRaw`UPDATE support_push_deliveries SET leaseUntil=NULL,leaseToken=NULL,availableAt=DATE_ADD(NOW(3),INTERVAL ${delay} SECOND) WHERE id=${job.id} AND leaseToken=${token}`;
      }
    }
  }
  return { delivered, skipped, failed };
}
