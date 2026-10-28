import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  assertConversationAccess,
  assertMessageAccess,
  SupportError,
} from './policy';
import type { Conversation, SupportActor, SupportMessage } from './policy';

type DB = Prisma.TransactionClient;
const fields =
  'id, brand, customerId, ownerKind, orderId, subject, country, status, assignedTo, createdAt, updatedAt, firstResponseAt, resolvedAt';
const customerName = `CASE WHEN support_conversations.ownerKind='CUSTOMER' THEN
  (SELECT NULLIF(TRIM(CONCAT(COALESCE(u.userFirstname,''),' ',COALESCE(u.userLastname,''))), '')
   FROM users u WHERE CONVERT(u.pidUser USING utf8mb4) COLLATE utf8mb4_unicode_ci=support_conversations.customerId COLLATE utf8mb4_unicode_ci LIMIT 1)
  WHEN support_conversations.ownerKind='GUEST' THEN
    (SELECT g.contactName FROM support_guests g WHERE g.id=support_conversations.customerId LIMIT 1)
  ELSE NULL END AS customerName`;
// SQL fragments are constants. All request values remain bound parameters.
export function supportStore(prisma: PrismaClient) {
  async function locked(db: DB, actor: SupportActor, id: string) {
    const rows = await db.$queryRawUnsafe<Conversation[]>(
      `SELECT ${fields} FROM support_conversations WHERE id=? FOR UPDATE`,
      id,
    );
    assertConversationAccess(actor, rows[0]);
    return rows[0];
  }
  async function rateLimit(db: DB, actor: SupportActor) {
    if (actor.kind === 'GUEST') {
      const [guest] = await db.$queryRaw<
        Array<{ id: string }>
      >`SELECT id FROM support_guests WHERE id=${actor.id} AND expiresAt>NOW(3) AND claimedBy IS NULL FOR UPDATE`;
      if (!guest)
        throw new SupportError(
          403,
          'This guest chat has expired. Please reopen support.',
        );
    }
    const key = createHash('sha256')
      .update(`${actor.brand}:${actor.kind}:${actor.id}`)
      .digest('hex');
    await db.$executeRaw`INSERT INTO support_rate_limits (actorKey, windowStart, messageCount) VALUES (${key}, NOW(3), 0) ON DUPLICATE KEY UPDATE actorKey=${key}`;
    const [row] = await db.$queryRaw<
      Array<{ messageCount: number; elapsed: number }>
    >`SELECT messageCount, TIMESTAMPDIFF(SECOND, windowStart, NOW(3)) AS elapsed FROM support_rate_limits WHERE actorKey=${key} FOR UPDATE`;
    if (row.elapsed < 60 && row.messageCount >= 20)
      throw new SupportError(
        429,
        'Please wait a moment before sending another message.',
      );
    await db.$executeRaw`UPDATE support_rate_limits SET messageCount=IF(TIMESTAMPDIFF(SECOND, windowStart, NOW(3)) >= 60, 1, messageCount+1), windowStart=IF(TIMESTAMPDIFF(SECOND, windowStart, NOW(3)) >= 60, NOW(3), windowStart) WHERE actorKey=${key}`;
  }
  async function enqueue(db: DB, id: string, actor: SupportActor) {
    if (actor.kind !== 'AGENT') {
      await db.$executeRaw`INSERT INTO support_push_deliveries (conversationId,subscriptionId,availableAt) SELECT ${id},id,DATE_ADD(NOW(3), INTERVAL 5 MINUTE) FROM support_push_subscriptions WHERE active=TRUE AND expiresAt>NOW(3) ON DUPLICATE KEY UPDATE revision=revision+1,availableAt=DATE_ADD(NOW(3), INTERVAL 5 MINUTE),attempts=0`;
    }
    const audience = actor.kind === 'AGENT' ? 'CUSTOMER' : 'TEAM';
    // Coalesce customer messages for five minutes; customer reply emails retain their one-minute delay.
    const delay = audience === 'TEAM' ? 5 : 1;
    await db.$executeRaw`INSERT INTO support_notifications (conversationId, audience, availableAt) VALUES (${id}, ${audience}, DATE_ADD(NOW(3), INTERVAL ${delay} MINUTE)) ON DUPLICATE KEY UPDATE revision=revision+1, availableAt=DATE_ADD(NOW(3), INTERVAL ${delay} MINUTE), attempts=0`;
  }
  return {
    async list(actor: SupportActor) {
      return actor.kind === 'AGENT'
        ? prisma.$queryRawUnsafe<Conversation[]>(
            `SELECT ${fields}, ${customerName} FROM support_conversations ORDER BY updatedAt DESC, id DESC LIMIT 100`,
          )
        : prisma.$queryRawUnsafe<Conversation[]>(
            `SELECT ${fields}, ${customerName} FROM support_conversations WHERE brand=? AND customerId=? AND ownerKind=? ORDER BY updatedAt DESC, id DESC LIMIT 100`,
            actor.brand,
            actor.id,
            actor.kind,
          );
    },
    async history(actor: SupportActor, id: string, after: number) {
      const [conversation] = await prisma.$queryRawUnsafe<Conversation[]>(
        `SELECT ${fields}, ${customerName} FROM support_conversations WHERE id=?`,
        id,
      );
      assertConversationAccess(actor, conversation);
      const messages = await prisma.$queryRawUnsafe<SupportMessage[]>(
        `SELECT id, conversationId, authorKind,
          CASE WHEN authorKind='AGENT' THEN
            (SELECT NULLIF(TRIM(a.userFirstname),'') FROM admin a WHERE a.pidUser COLLATE utf8mb4_unicode_ci=support_messages.authorId COLLATE utf8mb4_unicode_ci LIMIT 1)
          ELSE NULL END AS authorName,
          body, internal, createdAt, attachmentName, attachmentSize, (SELECT expiresAt FROM support_files WHERE asset=support_messages.attachmentAsset) AS attachmentExpiresAt FROM support_messages WHERE conversationId=? AND id>? ${actor.kind !== 'AGENT' ? 'AND internal=FALSE' : ''} ORDER BY id ASC LIMIT 100`,
        id,
        after,
      );
      return { conversation, messages, hasMore: messages.length === 100 };
    },
    async create(
      actor: SupportActor,
      input: {
        requestKey: string;
        subject: string;
        body: string;
        orderId?: string;
      },
      country: string | null,
    ) {
      if (actor.kind === 'AGENT')
        throw new SupportError(403, 'Only customers can start a conversation.');
      return prisma.$transaction(async (db) => {
        if (input.orderId) {
          if (actor.kind !== 'CUSTOMER')
            throw new SupportError(403, 'Sign in to attach an order.');
          const order = await db.orders.findFirst({
            where: { pidOrder: input.orderId, pidUser: actor.id },
            select: { pidOrder: true },
          });
          if (!order) throw new SupportError(404, 'Order not found.');
        }
        // Serializes create/retry per account, including simultaneous requests.
        await rateLimit(db, actor);
        const existing = await db.$queryRaw<
          Array<{
            id: string;
            subject: string;
            body: string;
            orderId?: string | null;
          }>
        >`SELECT c.id, c.subject, c.orderId, m.body FROM support_conversations c JOIN support_messages m ON m.conversationId=c.id AND m.requestKey=c.requestKey AND m.authorKind!='AGENT' WHERE c.brand=${actor.brand} AND c.customerId=${actor.id} AND c.ownerKind=${actor.kind} AND c.requestKey=${input.requestKey} ORDER BY m.id ASC LIMIT 1`;
        if (existing[0]) {
          if (
            existing[0].subject !== input.subject ||
            existing[0].body !== input.body ||
            (existing[0].orderId || null) !== (input.orderId || null)
          )
            throw new SupportError(
              409,
              'This message was already sent. Refresh the conversation before sending new text.',
            );
          return existing[0].id;
        }
        const id = randomBytes(16).toString('hex');
        await db.$executeRaw`INSERT INTO support_conversations (id, brand, customerId, ownerKind, orderId, requestKey, subject, country) VALUES (${id}, ${actor.brand}, ${actor.id}, ${actor.kind}, ${input.orderId || null}, ${input.requestKey}, ${input.subject}, ${country})`;
        await db.$executeRaw`INSERT INTO support_messages (conversationId, authorId, authorKind, requestKey, body) VALUES (${id}, ${actor.id}, ${actor.kind}, ${input.requestKey}, ${input.body})`;
        await enqueue(db, id, actor);
        return id;
      });
    },
    async send(
      actor: SupportActor,
      id: string,
      input: {
        requestKey: string;
        body: string;
        internal: boolean;
        attachment?: {
          asset: string;
          name: string;
          size: number;
          hash: string;
          retentionDays?: number;
        };
      },
    ) {
      assertMessageAccess(actor, input.internal);
      return prisma.$transaction(async (db) => {
        await locked(db, actor, id);
        const previous = await db.$queryRaw<
          Array<{
            id: number;
            body: string;
            internal: boolean | number;
            attachmentHash: string | null;
          }>
        >`SELECT id, body, internal, attachmentHash FROM support_messages WHERE conversationId=${id} AND authorId=${actor.id} AND authorKind=${actor.kind} AND requestKey=${input.requestKey}`;
        if (previous[0]) {
          if (
            previous[0].body !== input.body ||
            Boolean(previous[0].internal) !== input.internal ||
            (previous[0].attachmentHash || null) !==
              (input.attachment?.hash || null)
          )
            throw new SupportError(
              409,
              'This message was already sent. Refresh before sending new text.',
            );
          return false;
        }
        await rateLimit(db, actor);
        await db.$executeRaw`INSERT INTO support_messages (conversationId, authorId, authorKind, requestKey, body, internal, attachmentAsset, attachmentName, attachmentSize, attachmentHash) VALUES (${id}, ${actor.id}, ${actor.kind}, ${input.requestKey}, ${input.body}, ${input.internal}, ${input.attachment?.asset || null}, ${input.attachment?.name || null}, ${input.attachment?.size || null}, ${input.attachment?.hash || null})`;
        if (input.attachment)
          await db.$executeRaw`UPDATE support_files SET expiresAt=DATE_ADD(NOW(3),INTERVAL ${input.attachment.retentionDays || 30} DAY) WHERE asset=${input.attachment.asset}`;
        if (!input.internal) await enqueue(db, id, actor);
        if (input.internal) {
          await db.$executeRaw`UPDATE support_conversations SET updatedAt=NOW(3) WHERE id=${id}`;
        } else if (actor.kind === 'AGENT') {
          await db.$executeRaw`UPDATE support_conversations SET status='WAITING_CUSTOMER', firstResponseAt=COALESCE(firstResponseAt, NOW(3)), resolvedAt=NULL, updatedAt=NOW(3), assignedTo=COALESCE(assignedTo, ${actor.id}) WHERE id=${id}`;
        } else {
          await db.$executeRaw`UPDATE support_conversations SET status='OPEN', resolvedAt=NULL, updatedAt=NOW(3) WHERE id=${id}`;
        }
        return true;
      });
    },
    async prepareAttachment(
      actor: SupportActor,
      id: string,
      internal: boolean,
    ) {
      assertMessageAccess(actor, internal);
      await prisma.$transaction(async (db) => {
        await locked(db, actor, id);
        await rateLimit(db, actor);
      });
    },
    async attachment(actor: SupportActor, id: string, messageId: number) {
      const [conversation] = await prisma.$queryRawUnsafe<Conversation[]>(
        `SELECT ${fields}, ${customerName} FROM support_conversations WHERE id=?`,
        id,
      );
      assertConversationAccess(actor, conversation);
      const [file] = await prisma.$queryRaw<
        Array<{
          attachmentAsset: string;
          attachmentName: string;
          attachmentSize: number;
          internal: boolean;
        }>
      >`SELECT attachmentAsset,attachmentName,attachmentSize,internal FROM support_messages WHERE conversationId=${id} AND id=${messageId} AND attachmentName IS NOT NULL`;
      if (!file || (file.internal && actor.kind !== 'AGENT'))
        throw new SupportError(404, 'File not found.');
      return file;
    },
    async setStatus(
      actor: SupportActor,
      id: string,
      status: Conversation['status'],
    ) {
      if (actor.kind !== 'AGENT')
        throw new SupportError(403, 'Only the support team can change status.');
      await prisma.$transaction(async (db) => {
        await locked(db, actor, id);
        await db.$executeRaw`UPDATE support_conversations SET status=${status}, resolvedAt=IF(${status}='RESOLVED', COALESCE(resolvedAt,NOW(3)),NULL), updatedAt=NOW(3), assignedTo=COALESCE(assignedTo,${actor.id}) WHERE id=${id}`;
      });
    },
    async analytics(actor: SupportActor) {
      if (actor.kind !== 'AGENT')
        throw new SupportError(
          403,
          'Only the support team can view analytics.',
        );
      const [row] = await prisma.$queryRaw<
        Array<{
          total: bigint;
          open: bigint | null;
          waiting: bigint | null;
          resolved: bigint | null;
          unanswered: bigint | null;
          avgFirstResponseSeconds: unknown;
        }>
      >`SELECT COUNT(*) AS total, SUM(status='OPEN') AS open, SUM(status='WAITING_CUSTOMER') AS waiting, SUM(status='RESOLVED') AS resolved, SUM(firstResponseAt IS NULL AND status!='RESOLVED') AS unanswered, AVG(TIMESTAMPDIFF(SECOND, createdAt, firstResponseAt)) AS avgFirstResponseSeconds FROM support_conversations WHERE createdAt >= DATE_SUB(NOW(3), INTERVAL 30 DAY)`;
      return Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key,
          value === null ? null : Number(value),
        ]),
      );
    },
  };
}
