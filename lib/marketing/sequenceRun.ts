import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';

import {
  getMarketingBatchSize,
  getMarketingDailySendLimit,
  getMarketingProvider,
} from './config';
import { sendSequenceStep } from './operations';
import { seedChinaImportSequence } from './sequenceSeed';

const ACTIVE_STATUS = 'ACTIVE';
const SENDING_STATUS = 'SENDING';
const COMPLETED_STATUS = 'COMPLETED';
const RETRY_DELAY_MS = 6 * 60 * 60 * 1000;
const STALE_SEND_MS = 20 * 60 * 1000;

function nextSendDate(currentDelayDays: number, nextDelayDays: number) {
  const days = Math.max(nextDelayDays - currentDelayDays, 1);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function processMarketingSequence() {
  if (getMarketingProvider() !== 'hostinger') {
    return { enabled: false, provider: getMarketingProvider(), enrolled: 0, due: 0, sent: 0, failed: 0 };
  }

  const sequence =
    (await prisma.marketing_sequences.findUnique({
      where: { pidSequence: 'SEQ-CHINA-IMPORT-52-WEEKS' },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    })) || (await seedChinaImportSequence('SYSTEM-HOSTINGER'));
  if (sequence.status !== 'ACTIVE') {
    await prisma.marketing_sequences.update({
      where: { id: sequence.id },
      data: { status: 'ACTIVE', activatedAt: sequence.activatedAt || new Date() },
    });
  }
  const eligibleContacts = await prisma.marketing_contacts.findMany({
    where: { status: 'ACTIVE', consentStatus: 'OPTED_IN' },
    select: { id: true },
  });

  const enrollmentCountBefore = await prisma.marketing_enrollments.count({
    where: { sequenceId: sequence.id },
  });
  for (const contact of eligibleContacts) {
    await prisma.marketing_enrollments.upsert({
      where: { contactId_sequenceId: { contactId: contact.id, sequenceId: sequence.id } },
      create: {
        pidEnrollment: randomUUID(),
        contactId: contact.id,
        sequenceId: sequence.id,
        status: ACTIVE_STATUS,
        currentStep: 0,
        nextSendAt: new Date(),
      },
      update: {},
    });
    await prisma.marketing_enrollments.updateMany({
      where: {
        contactId: contact.id,
        sequenceId: sequence.id,
        status: 'CANCELLED',
      },
      data: { status: ACTIVE_STATUS, nextSendAt: new Date(), completedAt: null },
    });
  }
  const enrollmentCountAfter = await prisma.marketing_enrollments.count({
    where: { sequenceId: sequence.id },
  });
  const enrolled = Math.max(enrollmentCountAfter - enrollmentCountBefore, 0);

  await prisma.marketing_enrollments.updateMany({
    where: {
      sequenceId: sequence.id,
      status: SENDING_STATUS,
      updatedAt: { lt: new Date(Date.now() - STALE_SEND_MS) },
    },
    data: { status: ACTIVE_STATUS },
  });

  const rollingWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const attempted = await prisma.marketing_deliveries.count({
    where: { provider: 'HOSTINGER', attemptedAt: { gte: rollingWindow } },
  });
  const remaining = Math.max(getMarketingDailySendLimit() - attempted, 0);
  const take = Math.min(getMarketingBatchSize(), remaining);
  if (!take) {
    return { enabled: true, provider: 'hostinger', enrolled, due: 0, sent: 0, failed: 0, dailyRemaining: 0 };
  }

  const due = await prisma.marketing_enrollments.findMany({
    where: {
      sequenceId: sequence.id,
      status: ACTIVE_STATUS,
      nextSendAt: { lte: new Date() },
      contact: { status: 'ACTIVE', consentStatus: 'OPTED_IN' },
    },
    orderBy: [{ nextSendAt: 'asc' }, { id: 'asc' }],
    take,
    include: { contact: true },
  });

  let sent = 0;
  let failed = 0;
  for (const enrollment of due) {
    const claimed = await prisma.marketing_enrollments.updateMany({
      where: { id: enrollment.id, status: ACTIVE_STATUS, currentStep: enrollment.currentStep },
      data: { status: SENDING_STATUS },
    });
    if (!claimed.count) continue;

    const step = await prisma.marketing_sequence_steps.findUnique({
      where: {
        sequenceId_stepNumber: {
          sequenceId: enrollment.sequenceId,
          stepNumber: enrollment.currentStep,
        },
      },
    });
    if (!step || step.status !== 'ACTIVE') {
      await prisma.marketing_enrollments.update({
        where: { id: enrollment.id },
        data: { status: COMPLETED_STATUS, nextSendAt: null, completedAt: new Date() },
      });
      continue;
    }

    try {
      await sendSequenceStep({
        stepId: step.id,
        email: enrollment.contact.email,
        firstName: enrollment.contact.firstName,
        enrollmentId: enrollment.id,
        idempotencyKey: `sequence:${enrollment.pidEnrollment}:step:${step.stepNumber}`,
        tags: { sequence: sequence.pidSequence, step: String(step.stepNumber) },
      });
      const nextStep = await prisma.marketing_sequence_steps.findUnique({
        where: {
          sequenceId_stepNumber: {
            sequenceId: enrollment.sequenceId,
            stepNumber: step.stepNumber + 1,
          },
        },
      });
      await prisma.marketing_enrollments.update({
        where: { id: enrollment.id },
        data: nextStep
          ? {
              status: ACTIVE_STATUS,
              currentStep: nextStep.stepNumber,
              lastSentAt: new Date(),
              nextSendAt: nextSendDate(step.delayDays, nextStep.delayDays),
            }
          : {
              status: COMPLETED_STATUS,
              currentStep: step.stepNumber + 1,
              lastSentAt: new Date(),
              nextSendAt: null,
              completedAt: new Date(),
            },
      });
      sent += 1;
    } catch (error) {
      console.error('Hostinger marketing sequence send failed', {
        enrollment: enrollment.pidEnrollment,
        recipient: enrollment.contact.email,
        error,
      });
      await prisma.marketing_enrollments.update({
        where: { id: enrollment.id },
        data: { status: ACTIVE_STATUS, nextSendAt: new Date(Date.now() + RETRY_DELAY_MS) },
      });
      failed += 1;
    }
  }

  return {
    enabled: true,
    provider: 'hostinger',
    enrolled,
    due: due.length,
    sent,
    failed,
    dailyRemaining: Math.max(remaining - sent, 0),
  };
}
