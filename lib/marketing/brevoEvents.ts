import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { removeBrevoMarketingContact } from './brevoContacts';

export async function recordBrevoEvent(payload: Record<string, unknown>) {
  const messageId = typeof payload['message-id'] === 'string' ? payload['message-id'] : '';
  if (!messageId) return false;
  const delivery = await prisma.marketing_deliveries.findUnique({ where: { sesMessageId: messageId } });
  // Brevo is shared with other brands: only act on our own recorded deliveries.
  if (!delivery) {
    const tags = Array.isArray(payload.tags) ? payload.tags : [payload.tag];
    if (tags.includes('sureimports-marketing')) throw new Error('Delivery not yet recorded; retry webhook.');
    return false;
  }
  if (delivery.provider !== 'BREVO') return false;
  if (typeof payload.email === 'string' && payload.email.toLowerCase() !== delivery.recipientEmail.toLowerCase()) return false;
  const event = String(payload.event || '').toLowerCase().replace(/[_ -]/g, '');
  const timestamp = Number(payload.ts_event || payload.ts);
  const occurredAt = Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp * 1000) : new Date();
  const dedupeKey = createHash('sha256').update(`brevo:${messageId}:${event}:${payload.id || ''}:${payload.ts_event || payload.ts || ''}:${payload.link || ''}`).digest('hex');
  const deliveryUpdate: Prisma.marketing_deliveriesUpdateInput = {};
  const contactUpdate: Prisma.marketing_contactsUpdateInput = {};
  if (event === 'delivered') Object.assign(deliveryUpdate, { deliveredAt: occurredAt });
  if (event === 'opened' || event === 'uniqueopened') Object.assign(deliveryUpdate, { openedAt: occurredAt });
  if (event === 'click') Object.assign(deliveryUpdate, { clickedAt: occurredAt });
  if (event === 'hardbounce' || event === 'invalid') {
    Object.assign(deliveryUpdate, { status: 'BOUNCED', bouncedAt: occurredAt });
    Object.assign(contactUpdate, { status: 'BOUNCED', consentStatus: 'SUPPRESSED', bouncedAt: occurredAt });
  }
  if (event === 'spam') {
    Object.assign(deliveryUpdate, { status: 'COMPLAINED', complainedAt: occurredAt });
    Object.assign(contactUpdate, { status: 'COMPLAINED', consentStatus: 'SUPPRESSED', complainedAt: occurredAt });
  }
  if (event === 'unsubscribed') {
    Object.assign(deliveryUpdate, { status: 'UNSUBSCRIBED', unsubscribedAt: occurredAt });
    Object.assign(contactUpdate, { status: 'UNSUBSCRIBED', consentStatus: 'OPTED_OUT', unsubscribedAt: occurredAt });
  }
  const suppress = Boolean(delivery.contactId && Object.keys(contactUpdate).length);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.marketing_events.create({ data: {
        pidEvent: randomUUID(), dedupeKey, deliveryId: delivery.id, sesMessageId: messageId,
        eventType: `BREVO_${event.toUpperCase()}`, payload: payload as Prisma.InputJsonObject, occurredAt,
      } });
      if (Object.keys(deliveryUpdate).length) await tx.marketing_deliveries.update({ where: { id: delivery.id }, data: deliveryUpdate });
      if (event === 'delivered') await tx.marketing_deliveries.updateMany({ where: { id: delivery.id, status: { in: ['SENDING', 'SENT'] } }, data: { status: 'DELIVERED' } });
      if (suppress) {
        await tx.marketing_contacts.update({ where: { id: delivery.contactId! }, data: { ...contactUpdate, optInTokenHash: null, optInExpiresAt: null } });
        await tx.marketing_enrollments.updateMany({ where: { contactId: delivery.contactId!, status: { in: ['ACTIVE', 'SENDING'] } }, data: { status: 'CANCELLED', nextSendAt: null } });
      }
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
  }
  // Also retry the remote removal for duplicate webhook deliveries.
  if (suppress) await removeBrevoMarketingContact(delivery.recipientEmail);
  return true;
}
