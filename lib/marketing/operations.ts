import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { getMarketingProvider, getMarketingSendMode } from './config';
import { sendMarketingEmail } from './delivery';
import { createMarketingUnsubscribeUrl } from './preferences';

export async function sendSequenceStep(input: {
  stepId: number;
  email: string;
  firstName?: string | null;
  idempotencyKey: string;
  enrollmentId?: number | null;
  tags?: Record<string, string>;
  testOnly?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.marketing_deliveries.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing && existing.status !== 'FAILED') return existing;

  const step = await prisma.marketing_sequence_steps.findUniqueOrThrow({
    where: { id: input.stepId },
  });
  let contact = await prisma.marketing_contacts.findUnique({ where: { email } });
  if (!contact) {
    if (!input.testOnly) {
      throw new Error('This address has not confirmed consent for marketing email.');
    }
    contact = await prisma.marketing_contacts.create({
      data: {
        pidContact: randomUUID(),
        email,
        firstName: input.firstName || null,
        status: 'ACTIVE',
        consentStatus: 'TEST_ONLY',
        consentSource: 'admin_internal_test',
      },
    });
  } else if (input.firstName && input.firstName !== contact.firstName) {
    contact = await prisma.marketing_contacts.update({
      where: { id: contact.id },
      data: { firstName: input.firstName },
    });
  }

  const allowedConsent = contact.consentStatus === 'OPTED_IN' ||
    (input.testOnly && contact.consentStatus === 'TEST_ONLY') ||
    (getMarketingProvider() === 'ses' &&
      getMarketingSendMode() === 'sandbox' &&
      contact.consentStatus === 'TEST_ONLY');
  if (!allowedConsent || contact.status !== 'ACTIVE') {
    throw new Error('This contact is not eligible to receive marketing email.');
  }

  const delivery = existing
    ? await prisma.marketing_deliveries.update({
        where: { id: existing.id },
        data: { status: 'SENDING', errorMessage: null, attemptedAt: new Date() },
      })
    : await prisma.marketing_deliveries.create({
        data: {
          pidDelivery: randomUUID(),
          contactId: contact.id,
          sequenceStepId: step.id,
          enrollmentId: input.enrollmentId || null,
          provider: getMarketingProvider().toUpperCase(),
          mode:
            getMarketingProvider() === 'hostinger'
              ? 'PRODUCTION'
              : getMarketingSendMode().toUpperCase(),
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
      unsubscribeUrl:
        contact.consentStatus === 'OPTED_IN'
          ? createMarketingUnsubscribeUrl({ email, pidContact: contact.pidContact })
          : null,
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
        errorMessage: error instanceof Error ? error.message : 'Unknown email delivery error',
      },
    });
    throw error;
  }
}
