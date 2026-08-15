import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { getMarketingSendMode } from './config';
import { sendMarketingEmail } from './ses';

export async function sendSequenceStep(input: {
  stepId: number;
  email: string;
  firstName?: string | null;
  idempotencyKey: string;
  enrollmentId?: number | null;
  tags?: Record<string, string>;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.marketing_deliveries.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing;

  const step = await prisma.marketing_sequence_steps.findUniqueOrThrow({
    where: { id: input.stepId },
  });
  const contact = await prisma.marketing_contacts.upsert({
    where: { email },
    create: {
      pidContact: randomUUID(),
      email,
      firstName: input.firstName || null,
      consentStatus: getMarketingSendMode() === 'sandbox' ? 'TEST_ONLY' : 'OPTED_IN',
      consentSource: getMarketingSendMode() === 'sandbox' ? 'ses_sandbox_recent_user' : 'admin_marketing',
      consentAt: getMarketingSendMode() === 'sandbox' ? null : new Date(),
    },
    update: input.firstName ? { firstName: input.firstName } : {},
  });

  const allowedConsent = contact.consentStatus === 'OPTED_IN' ||
    (getMarketingSendMode() === 'sandbox' && contact.consentStatus === 'TEST_ONLY');
  if (!allowedConsent || contact.status !== 'ACTIVE') {
    throw new Error('This contact is not eligible to receive marketing email.');
  }

  const delivery = await prisma.marketing_deliveries.create({
    data: {
      pidDelivery: randomUUID(),
      contactId: contact.id,
      sequenceStepId: step.id,
      enrollmentId: input.enrollmentId || null,
      mode: getMarketingSendMode().toUpperCase(),
      status: 'SENDING',
      recipientEmail: email,
      subject: step.subject,
      idempotencyKey: input.idempotencyKey,
      attemptedAt: new Date(),
    },
  });

  try {
    const sent = await sendMarketingEmail({
      recipientEmail: email,
      firstName: input.firstName,
      subject: step.subject,
      bodyTitle: step.title,
      previewText: step.previewText,
      bodyText: step.bodyText,
      ctaLabel: step.ctaLabel,
      ctaUrl: step.ctaUrl,
      tags: {
        delivery: delivery.pidDelivery,
        source: 'sequence',
        ...input.tags,
      },
    });
    return prisma.marketing_deliveries.update({
      where: { id: delivery.id },
      data: { status: 'SENT', sesMessageId: sent.messageId, sentAt: new Date() },
    });
  } catch (error) {
    await prisma.marketing_deliveries.update({
      where: { id: delivery.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown SES error',
      },
    });
    throw error;
  }
}
