import 'server-only';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  assertConversationAccess,
  conversationId,
  SupportError,
  trustedSupportMutation,
} from './policy';
import type { Conversation, SupportActor } from './policy';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const customerName = `CASE WHEN c.ownerKind='CUSTOMER' THEN
  (SELECT NULLIF(TRIM(CONCAT(COALESCE(u.userFirstname,''),' ',COALESCE(u.userLastname,''))), '')
   FROM users u WHERE CONVERT(u.pidUser USING utf8mb4) COLLATE utf8mb4_unicode_ci=c.customerId COLLATE utf8mb4_unicode_ci LIMIT 1)
  WHEN c.ownerKind='GUEST' THEN
    (SELECT g.contactName FROM support_guests g WHERE g.id=c.customerId LIMIT 1)
  ELSE NULL END`;
const eligible = `(a.userStatus IN ('superadmin','L1') OR EXISTS (SELECT 1 FROM admin_permissions p WHERE p.pidUser COLLATE utf8mb4_unicode_ci=a.pidUser COLLATE utf8mb4_unicode_ci AND p.serviceKey='customer_support' AND p.canView=TRUE AND p.canEdit=TRUE))`;
const inboxSchema = z.object({
  q: z.string().trim().max(120).default(''),
  status: z
    .enum(['ALL', 'OPEN', 'WAITING_CUSTOMER', 'RESOLVED'])
    .default('ALL'),
  assigned: z.string().max(191).default('ALL'),
  unread: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export function supportManagement(db: PrismaClient) {
  async function agents() {
    return db.$queryRawUnsafe<Array<{ id: string; name: string }>>(
      `SELECT a.pidUser AS id,TRIM(CONCAT(COALESCE(a.userFirstname,''),' ',COALESCE(a.userLastname,''))) AS name FROM admin a WHERE ${eligible} ORDER BY name,a.pidUser`,
    );
  }
  return {
    agents,
    async inbox(actor: SupportActor, params: URLSearchParams) {
      const input = inboxSchema.parse(Object.fromEntries(params));
      const unread = `(SELECT COUNT(*) FROM support_messages m WHERE m.conversationId=c.id AND m.authorKind!='AGENT' AND m.internal=FALSE AND m.id>COALESCE((SELECT lastReadMessageId FROM support_reads r WHERE r.conversationId=c.id AND r.adminId=?),0))`;
      const where = ['1=1'];
      const values: unknown[] = [];
      if (input.q) {
        where.push(
          "(LOCATE(?,c.subject)>0 OR LOCATE(?,c.customerId)>0 OR LOCATE(?,COALESCE(c.orderId,''))>0)",
        );
        values.push(input.q, input.q, input.q);
      }
      if (input.status !== 'ALL') {
        where.push('c.status=?');
        values.push(input.status);
      }
      if (input.assigned === 'UNASSIGNED') where.push('c.assignedTo IS NULL');
      else if (input.assigned !== 'ALL') {
        where.push('c.assignedTo=?');
        values.push(input.assigned === 'ME' ? actor.id : input.assigned);
      }
      if (input.unread === 'true') {
        where.push(`${unread}>0`);
        values.push(actor.id);
      }
      const clause = where.join(' AND ');
      const [rows, count] = await Promise.all([
        db.$queryRawUnsafe<Array<Conversation & { unreadCount: bigint }>>(
          `SELECT c.*,${customerName} AS customerName,${unread} AS unreadCount FROM support_conversations c WHERE ${clause} ORDER BY c.updatedAt DESC,c.id DESC LIMIT 25 OFFSET ?`,
          actor.id,
          ...values,
          (input.page - 1) * 25,
        ),
        db.$queryRawUnsafe<Array<{ total: bigint }>>(
          `SELECT COUNT(*) AS total FROM support_conversations c WHERE ${clause}`,
          ...values,
        ),
      ]);
      return {
        conversations: rows.map((row) => ({
          ...row,
          unreadCount: Number(row.unreadCount),
        })),
        total: Number(count[0].total),
        page: input.page,
        pageSize: 25,
      };
    },
    async read(actor: SupportActor, id: string, cursor: number) {
      await db.$transaction(async (tx) => {
        const [conversation] = await tx.$queryRaw<
          Conversation[]
        >`SELECT * FROM support_conversations WHERE id=${id} FOR UPDATE`;
        assertConversationAccess(actor, conversation);
        const [last] = await tx.$queryRaw<
          Array<{ id: number | null }>
        >`SELECT MAX(id) AS id FROM support_messages WHERE conversationId=${id} AND id<=${cursor}`;
        if (last.id)
          await tx.$executeRaw`INSERT INTO support_reads (conversationId,adminId,lastReadMessageId) VALUES (${id},${actor.id},${last.id}) ON DUPLICATE KEY UPDATE lastReadMessageId=GREATEST(lastReadMessageId,${last.id}),updatedAt=NOW(3)`;
      });
      return { ok: true };
    },
    async assign(actor: SupportActor, id: string, assignedTo: string | null) {
      await db.$transaction(async (tx) => {
        const [conversation] = await tx.$queryRaw<
          Conversation[]
        >`SELECT * FROM support_conversations WHERE id=${id} FOR UPDATE`;
        assertConversationAccess(actor, conversation);
        if (assignedTo) {
          const available = await tx.$queryRawUnsafe<Array<{ id: string }>>(
            `SELECT a.pidUser AS id FROM admin a WHERE a.pidUser=? AND ${eligible}`,
            assignedTo,
          );
          if (!available.length)
            throw new SupportError(
              400,
              'Choose an admin with support edit access.',
            );
        }
        await tx.$executeRaw`UPDATE support_conversations SET assignedTo=${assignedTo},updatedAt=NOW(3) WHERE id=${id}`;
      });
      return { ok: true };
    },
    async reports(days: number) {
      const [summary, daily, workload] = await Promise.all([
        db.$queryRaw<
          Array<Record<string, unknown>>
        >`SELECT COUNT(*) AS total,SUM(status='OPEN') AS open,SUM(status='WAITING_CUSTOMER') AS waiting,SUM(status='RESOLVED') AS resolved,SUM(firstResponseAt IS NULL AND status!='RESOLVED') AS unanswered,AVG(TIMESTAMPDIFF(SECOND,createdAt,firstResponseAt)) AS avgFirstResponseSeconds,AVG(IF(status='RESOLVED',TIMESTAMPDIFF(SECOND,createdAt,resolvedAt),NULL)) AS avgResolutionSeconds FROM support_conversations WHERE createdAt>=DATE_SUB(NOW(3),INTERVAL ${days} DAY)`,
        db.$queryRaw<
          Array<Record<string, unknown>>
        >`SELECT DATE_FORMAT(createdAt,'%Y-%m-%d') AS date,COUNT(*) AS conversations FROM support_conversations WHERE createdAt>=DATE_SUB(NOW(3),INTERVAL ${days} DAY) GROUP BY DATE_FORMAT(createdAt,'%Y-%m-%d') ORDER BY date`,
        db.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT a.pidUser AS id,TRIM(CONCAT(COALESCE(a.userFirstname,''),' ',COALESCE(a.userLastname,''))) AS name,(SELECT COUNT(*) FROM support_conversations c WHERE c.assignedTo=a.pidUser COLLATE utf8mb4_unicode_ci AND c.status!='RESOLVED') AS active,(SELECT COUNT(*) FROM support_messages m WHERE m.authorId=a.pidUser COLLATE utf8mb4_unicode_ci AND m.authorKind='AGENT' AND m.internal=FALSE AND m.createdAt>=DATE_SUB(NOW(3),INTERVAL ? DAY)) AS replies FROM admin a WHERE ${eligible} ORDER BY name`,
          days,
        ),
      ]);
      const [backlog] = await db.$queryRaw<
        Array<Record<string, unknown>>
      >`SELECT COUNT(*) AS backlog,SUM(createdAt<DATE_SUB(NOW(3),INTERVAL 24 HOUR) AND firstResponseAt IS NULL) AS overdue FROM support_conversations WHERE status!='RESOLVED'`;
      const normalize = (row: Record<string, unknown>) =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [
            k,
            typeof v === 'bigint'
              ? Number(v)
              : v !== null && typeof v === 'object'
                ? Number(v)
                : v,
          ]),
        );
      return {
        days,
        summary: normalize({ ...summary[0], ...backlog }),
        daily: daily.map(normalize),
        workload: workload.map(normalize),
      };
    },
  };
}
export function managementEndpoints(
  db: PrismaClient,
  resolve: (edit: boolean) => Promise<{ actor: SupportActor } | null>,
) {
  const store = supportManagement(db);
  return async (
    request: Request,
    action: 'inbox' | 'agents' | 'read' | 'assign' | 'reports',
    id?: string,
  ) => {
    try {
      if (process.env.SUPPORT_CHAT_ENABLED !== 'true')
        throw new SupportError(404, 'Support is unavailable.');
      if (request.method !== 'GET' && !trustedSupportMutation(request))
        throw new SupportError(403, 'Use the support inbox.');
      const identity = await resolve(action === 'assign');
      if (!identity || identity.actor.kind !== 'AGENT')
        throw new SupportError(403, 'Support access is required.');
      const params = new URL(request.url).searchParams;
      let result: unknown;
      if (action === 'inbox')
        result = await store.inbox(identity.actor, params);
      else if (action === 'agents') result = { agents: await store.agents() };
      else if (action === 'reports')
        result = await store.reports(
          z.coerce
            .number()
            .refine((n) => [7, 30, 90].includes(n))
            .parse(params.get('days') || 30),
        );
      else {
        const reader = request.body?.getReader();
        if (!reader) throw new SupportError(400, 'Missing request.');
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 2048) {
              await reader.cancel();
              throw new SupportError(413, 'Request too large.');
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
        const input = JSON.parse(Buffer.concat(chunks).toString());
        const conversation = conversationId.parse(id);
        if (action === 'read')
          result = await store.read(
            identity.actor,
            conversation,
            z
              .object({ cursor: z.number().int().positive().max(2147483647) })
              .strict()
              .parse(input).cursor,
          );
        else
          result = await store.assign(
            identity.actor,
            conversation,
            z
              .object({ assignedTo: z.string().min(1).max(191).nullable() })
              .strict()
              .parse(input).assignedTo,
          );
      }
      return Response.json(result, { headers });
    } catch (error) {
      const status =
        error instanceof SupportError
          ? error.status
          : error instanceof z.ZodError || error instanceof SyntaxError
            ? 400
            : 503;
      return Response.json(
        {
          error:
            error instanceof SupportError
              ? error.message
              : status === 400
                ? 'Check your filters or selection.'
                : 'Support is temporarily unavailable.',
        },
        { status, headers },
      );
    }
  };
}
