import {
  claimWelcome,
  finishWelcome,
  getWelcome,
  welcomeContent,
} from '@/lib/webinar/delivery';
import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { getMarketingProvider, getMarketingSendMode } from './config';
import { sendMarketingEmail } from './delivery';
import { createMarketingUnsubscribeUrl } from './preferences';
import { syncBrevoMarketingContact } from './brevoContacts';
import { hasConfirmedMarketingConsent } from './brevoConsent';

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
  let contact = await prisma.marketing_contacts.findUnique({
    where: { email },
  });
  if (!contact) {
    if (!input.testOnly) {
      throw new Error(
        'This address has not confirmed consent for marketing email.',
      );
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

  const allowedConsent =
    contact.consentStatus === 'OPTED_IN' ||
    (input.testOnly && contact.consentStatus === 'TEST_ONLY') ||
    (getMarketingProvider() === 'ses' &&
      getMarketingSendMode() === 'sandbox' &&
      contact.consentStatus === 'TEST_ONLY');
  if (!allowedConsent || contact.status !== 'ACTIVE') {
    throw new Error('This contact is not eligible to receive marketing email.');
  }

  if (
    getMarketingProvider() === 'brevo' &&
    contact.consentStatus !== 'TEST_ONLY'
  ) {
    if (
      !hasConfirmedMarketingConsent(contact) ||
      !(await syncBrevoMarketingContact(email))
    ) {
      throw new Error(
        'This contact does not have active, confirmed marketing consent or is suppressed in Brevo.',
      );
    }
  }

  const isWelcome = step.pidStep === 'STEP-CHINA-IMPORT-00' && !input.testOnly;
  if (isWelcome) {
    if (!(await claimWelcome(email))) {
      const previous = await getWelcome(email);
      if (previous?.welcomeStatus === 'SENT')
        return { status: 'SKIPPED', sentAt: previous.sentAt };
      throw new Error('Welcome delivery is in progress or requires review.');
    }
  }
  try {
    const content =
      step.pidStep === 'STEP-CHINA-IMPORT-00'
        ? await welcomeContent(email, true)
        : step;
    const delivery = existing
      ? await prisma.marketing_deliveries.update({
          where: { id: existing.id },
          data: {
            status: 'SENDING',
            errorMessage: null,
            attemptedAt: new Date(),
            provider: getMarketingProvider().toUpperCase(),
            mode:
              getMarketingProvider() === 'ses'
                ? getMarketingSendMode().toUpperCase()
                : 'PRODUCTION',
          },
        })
      : await prisma.marketing_deliveries.create({
          data: {
            pidDelivery: randomUUID(),
            contactId: contact.id,
            sequenceStepId: step.id,
            enrollmentId: input.enrollmentId || null,
            provider: getMarketingProvider().toUpperCase(),
            mode:
              getMarketingProvider() !== 'ses'
                ? 'PRODUCTION'
                : getMarketingSendMode().toUpperCase(),
            status: 'SENDING',
            recipientEmail: email,
            subject: content.subject,
            idempotencyKey: input.idempotencyKey,
            attemptedAt: new Date(),
          },
        });

    try {
      const sent = await sendMarketingEmail({
        recipientEmail: email,
        testOnly: input.testOnly,
        firstName: input.firstName,
        subject: content.subject,
        bodyTitle: content.title,
        previewText: content.previewText,
        bodyText: content.bodyText,
        ctaLabel: content.ctaLabel,
        ctaUrl: content.ctaUrl,
        unsubscribeUrl:
          contact.consentStatus === 'OPTED_IN'
            ? createMarketingUnsubscribeUrl({
                email,
                pidContact: contact.pidContact,
              })
            : null,
        tags: {
          delivery: delivery.pidDelivery,
          source: 'sequence',
          ...input.tags,
        },
      });
      if (isWelcome) await finishWelcome(email, true);
      return prisma.marketing_deliveries.update({
        where: { id: delivery.id },
        data: {
          status: 'SENT',
          sesMessageId: sent.messageId,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.marketing_deliveries.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Unknown email delivery error',
        },
      });
      throw error;
    }
  } catch (error) {
    if (isWelcome) await finishWelcome(email, false);
    throw error;
  }
}
