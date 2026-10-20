import { z } from 'zod';

export const supportBrand = 'SURE_IMPORTS' as const;
export const requestKey = z.string().regex(/^[a-zA-Z0-9_-]{16,80}$/);
export const conversationId = z.string().regex(/^[a-f0-9]{32}$/);
export const messageSchema = z
  .object({
    requestKey,
    body: z.string().trim().min(1, 'Write a message first.').max(4000),
    internal: z.boolean().optional().default(false),
  })
  .strict();
export const createSchema = z
  .object({
    requestKey,
    subject: z.string().trim().min(3).max(120),
    body: z.string().trim().min(1).max(4000),
    orderId: z.string().trim().min(1).max(191).optional(),
  })
  .strict();
export const statusSchema = z
  .object({ status: z.enum(['OPEN', 'WAITING_CUSTOMER', 'RESOLVED']) })
  .strict();
export type SupportActor = {
  kind: 'CUSTOMER' | 'GUEST' | 'AGENT';
  id: string;
  brand: string;
};
export type Conversation = {
  id: string;
  brand: string;
  customerId: string;
  customerName?: string | null;
  ownerKind?: string;
  orderId?: string | null;
  subject: string;
  status: 'OPEN' | 'WAITING_CUSTOMER' | 'RESOLVED';
  country: string | null;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
};
export type SupportMessage = {
  id: number;
  conversationId: string;
  authorKind: 'CUSTOMER' | 'GUEST' | 'AGENT';
  authorName?: string | null;
  body: string;
  internal: boolean | number;
  createdAt: Date;
};
export class SupportError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assertConversationAccess(
  actor: SupportActor,
  conversation: Conversation | undefined,
) {
  // The same 404 for missing and inaccessible conversations avoids disclosing existence.
  if (
    !conversation ||
    (actor.kind !== 'AGENT' &&
      ((conversation.ownerKind || 'CUSTOMER') !== actor.kind ||
        conversation.customerId !== actor.id ||
        conversation.brand !== actor.brand))
  ) {
    throw new SupportError(404, 'Conversation not found.');
  }
}
export function assertMessageAccess(actor: SupportActor, internal: boolean) {
  if (internal && actor.kind !== 'AGENT')
    throw new SupportError(403, 'Internal notes are for the support team.');
}
export function trustedSupportMutation(request: Request) {
  const origin = request.headers.get('origin');
  return (
    origin === new URL(request.url).origin &&
    !['cross-site', 'same-site'].includes(
      request.headers.get('sec-fetch-site') || '',
    )
  );
}
export function messageCursor(value: string | null) {
  if (value === null) return 0;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw new SupportError(400, 'Invalid message cursor.');
  return Number(value);
}
