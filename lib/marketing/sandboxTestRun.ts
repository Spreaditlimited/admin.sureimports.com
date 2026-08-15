import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';

import {
  getSandboxAllowedRecipients,
  getSandboxTestFirstName,
  isFiveDaySandboxTestEnabled,
} from './config';
import { sendSequenceStep } from './operations';
import { seedChinaImportSequence } from './sequenceSeed';
import { verifySandboxRecipient } from './ses';

const TEST_STEP_COUNT = 5;
const TEST_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SEND_RATE_PAUSE_MS = 1_100;
const ACTIVE_STATUS = 'SANDBOX_TEST_ACTIVE';
const SENDING_STATUS = 'SANDBOX_TEST_SENDING';
const FAILED_STATUS = 'SANDBOX_TEST_FAILED';
const COMPLETED_STATUS = 'SANDBOX_TEST_COMPLETED';

function pause(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function prepareFiveDaySandboxTest() {
  if (!isFiveDaySandboxTestEnabled()) {
    return { enabled: false, ready: false, pendingVerification: [] as string[] };
  }

  const recipients = Array.from(getSandboxAllowedRecipients()).filter(
    (email) => !email.endsWith('@simulator.amazonses.com'),
  );
  if (recipients.length !== 5) {
    throw new Error(
      `The five-day sandbox test requires exactly 5 allowlisted inboxes; found ${recipients.length}.`,
    );
  }


  const existingSequence = await prisma.marketing_sequences.findUnique({
    where: { pidSequence: 'SEQ-CHINA-IMPORT-52-WEEKS' },
    include: { steps: true },
  });
  if (existingSequence) {
    const existingEnrollments = await prisma.marketing_enrollments.count({
      where: {
        sequenceId: existingSequence.id,
        contact: { email: { in: recipients } },
        status: { startsWith: 'SANDBOX_TEST_' },
      },
    });
    if (existingEnrollments === recipients.length) {
      return { enabled: true, ready: true, pendingVerification: [] as string[] };
    }
  }

  const pendingVerification: string[] = [];
  for (const email of recipients) {
    if (!(await verifySandboxRecipient(email))) pendingVerification.push(email);
  }
  if (pendingVerification.length) {
    return { enabled: true, ready: false, pendingVerification };
  }

  const sequence = await seedChinaImportSequence('SYSTEM-SANDBOX-TEST');
  if (sequence.steps.filter((step) => step.status === 'ACTIVE').length < TEST_STEP_COUNT) {
    throw new Error('The marketing sequence does not contain five active emails.');
  }

  await prisma.$transaction(async (tx) => {
    for (const email of recipients) {
      const contact = await tx.marketing_contacts.upsert({
        where: { email },
        create: {
          pidContact: randomUUID(),
          email,
          firstName: getSandboxTestFirstName(),
          status: 'ACTIVE',
          consentStatus: 'TEST_ONLY',
          consentSource: 'ses_internal_sandbox_test',
          consentContext: {
            purpose: 'five_day_production_content_test',
            ownerControlledInbox: true,
          },
          sesVerificationStatus: 'VERIFIED',
        },
        update: {
          status: 'ACTIVE',
          firstName: getSandboxTestFirstName(),
          sesVerificationStatus: 'VERIFIED',
        },
      });

      await tx.marketing_enrollments.upsert({
        where: {
          contactId_sequenceId: {
            contactId: contact.id,
            sequenceId: sequence.id,
          },
        },
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
    }
  });

  return { enabled: true, ready: true, pendingVerification: [] as string[] };
}

export async function processFiveDaySandboxTest() {
  const preparation = await prepareFiveDaySandboxTest();
  if (!preparation.ready) {
    return { ...preparation, sent: 0, completed: 0, failed: 0 };
  }

  const staleSendingCutoff = new Date(Date.now() - 15 * 60 * 1000);
  await prisma.marketing_enrollments.updateMany({
    where: {
      status: SENDING_STATUS,
      updatedAt: { lt: staleSendingCutoff },
    },
    data: { status: ACTIVE_STATUS },
  });

  const due = await prisma.marketing_enrollments.findMany({
    where: {
      status: ACTIVE_STATUS,
      nextSendAt: { lte: new Date() },
      currentStep: { lt: TEST_STEP_COUNT },
    },
    orderBy: [{ nextSendAt: 'asc' }, { id: 'asc' }],
    include: { contact: true, sequence: true },
  });

  let sent = 0;
  let completed = 0;
  let failed = 0;

  for (const enrollment of due) {
    const claimed = await prisma.marketing_enrollments.updateMany({
      where: {
        id: enrollment.id,
        status: ACTIVE_STATUS,
        currentStep: enrollment.currentStep,
      },
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
        data: { status: FAILED_STATUS, nextSendAt: null },
      });
      failed += 1;
      continue;
    }

    try {
      await sendSequenceStep({
        stepId: step.id,
        email: enrollment.contact.email,
        firstName: enrollment.contact.firstName,
        enrollmentId: enrollment.id,
        idempotencyKey: `sandbox-five-day:${enrollment.pidEnrollment}:step:${step.stepNumber}`,
        tags: { testRun: 'five-day', testDay: String(step.stepNumber + 1) },
      });

      const isComplete = step.stepNumber + 1 >= TEST_STEP_COUNT;
      await prisma.marketing_enrollments.update({
        where: { id: enrollment.id },
        data: {
          status: isComplete ? COMPLETED_STATUS : ACTIVE_STATUS,
          currentStep: step.stepNumber + 1,
          lastSentAt: new Date(),
          nextSendAt: isComplete
            ? null
            : new Date(Date.now() + TEST_INTERVAL_MS),
          completedAt: isComplete ? new Date() : null,
        },
      });
      sent += 1;
      if (isComplete) completed += 1;
    } catch (error) {
      console.error('Five-day SES sandbox test send failed', {
        enrollment: enrollment.pidEnrollment,
        recipient: enrollment.contact.email,
        error,
      });
      await prisma.marketing_enrollments.update({
        where: { id: enrollment.id },
        data: { status: FAILED_STATUS, nextSendAt: null },
      });
      failed += 1;
    }

    await pause(SEND_RATE_PAUSE_MS);
  }

  return {
    ...preparation,
    due: due.length,
    sent,
    completed,
    failed,
  };
}
