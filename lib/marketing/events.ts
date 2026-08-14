import { createHash, randomUUID } from 'node:crypto';
import { DeleteMessageCommand, ReceiveMessageCommand } from '@aws-sdk/client-sqs';

import { prisma } from '@/lib/prisma';
import { createMarketingSqsClient } from './aws';

type SesEvent = Record<string, any> & {
  eventType?: string;
  mail?: { messageId?: string; timestamp?: string };
};

function eventDate(payload: SesEvent) {
  const timestamp =
    payload.delivery?.timestamp || payload.bounce?.timestamp || payload.complaint?.timestamp ||
    payload.open?.timestamp || payload.click?.timestamp || payload.subscription?.timestamp ||
    payload.mail?.timestamp;
  return timestamp ? new Date(timestamp) : new Date();
}

export async function recordSesEvent(body: string) {
  const payload = JSON.parse(body) as SesEvent;
  const eventType = String(payload.eventType || 'UNKNOWN').toUpperCase();
  const sesMessageId = payload.mail?.messageId || null;
  const dedupeKey = createHash('sha256').update(body).digest('hex');
  const delivery = sesMessageId
    ? await prisma.marketing_deliveries.findUnique({ where: { sesMessageId } })
    : null;
  const occurredAt = eventDate(payload);

  try {
    await prisma.marketing_events.create({
      data: {
        pidEvent: randomUUID(), dedupeKey, deliveryId: delivery?.id || null,
        sesMessageId, eventType, payload, occurredAt,
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return false;
    throw error;
  }

  if (!delivery) return true;
  const deliveryUpdate: Record<string, any> = {};
  const contactUpdate: Record<string, any> = {};
  if (eventType === 'DELIVERY') Object.assign(deliveryUpdate, { status: 'DELIVERED', deliveredAt: occurredAt });
  if (eventType === 'OPEN') Object.assign(deliveryUpdate, { openedAt: occurredAt });
  if (eventType === 'CLICK') Object.assign(deliveryUpdate, { clickedAt: occurredAt });
  if (eventType === 'BOUNCE') {
    Object.assign(deliveryUpdate, { status: 'BOUNCED', bouncedAt: occurredAt });
    Object.assign(contactUpdate, { status: 'BOUNCED', consentStatus: 'SUPPRESSED', bouncedAt: occurredAt });
  }
  if (eventType === 'COMPLAINT') {
    Object.assign(deliveryUpdate, { status: 'COMPLAINED', complainedAt: occurredAt });
    Object.assign(contactUpdate, { status: 'COMPLAINED', consentStatus: 'SUPPRESSED', complainedAt: occurredAt });
  }
  if (eventType === 'SUBSCRIPTION' && payload.subscription?.newTopicPreferences?.some(
    (topic: { subscriptionStatus?: string }) => topic.subscriptionStatus === 'OPT_OUT',
  )) {
    Object.assign(deliveryUpdate, { status: 'UNSUBSCRIBED', unsubscribedAt: occurredAt });
    Object.assign(contactUpdate, { status: 'UNSUBSCRIBED', consentStatus: 'OPTED_OUT', unsubscribedAt: occurredAt });
  }
  if (Object.keys(deliveryUpdate).length) {
    await prisma.marketing_deliveries.update({ where: { id: delivery.id }, data: deliveryUpdate });
  }
  if (delivery.contactId && Object.keys(contactUpdate).length) {
    await prisma.marketing_contacts.update({ where: { id: delivery.contactId }, data: contactUpdate });
  }
  return true;
}

export async function processMarketingEventQueue(maxMessages = 10) {
  const queueUrl = process.env.SES_MARKETING_EVENT_QUEUE_URL?.trim();
  if (!queueUrl) throw new Error('SES_MARKETING_EVENT_QUEUE_URL is not configured.');
  const client = createMarketingSqsClient();
  const response = await client.send(new ReceiveMessageCommand({
    QueueUrl: queueUrl, MaxNumberOfMessages: Math.min(Math.max(maxMessages, 1), 10),
    WaitTimeSeconds: 1, VisibilityTimeout: 30,
  }));
  let processed = 0;
  for (const message of response.Messages || []) {
    if (!message.Body || !message.ReceiptHandle) continue;
    await recordSesEvent(message.Body);
    await client.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }));
    processed += 1;
  }
  return { received: response.Messages?.length || 0, processed };
}
