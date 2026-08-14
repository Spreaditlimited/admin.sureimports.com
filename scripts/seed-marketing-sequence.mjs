import { PrismaClient } from '@prisma/client';
import sequenceData from '../lib/marketing/data/import-email-sequence-52-weeks.json' with { type: 'json' };

const prisma = new PrismaClient();

try {
  const sequence = await prisma.marketing_sequences.upsert({
    where: { pidSequence: sequenceData.pidSequence },
    create: {
      pidSequence: sequenceData.pidSequence,
      name: sequenceData.name,
      description: sequenceData.description,
      triggerKey: sequenceData.triggerKey,
      cadence: sequenceData.cadence,
      status: 'DRAFT',
      totalSteps: sequenceData.steps.length,
      createdBy: 'SYSTEM-SEED',
    },
    update: {
      name: sequenceData.name,
      description: sequenceData.description,
      triggerKey: sequenceData.triggerKey,
      cadence: sequenceData.cadence,
      totalSteps: sequenceData.steps.length,
    },
  });

  for (const step of sequenceData.steps) {
    await prisma.marketing_sequence_steps.upsert({
      where: { sequenceId_stepNumber: { sequenceId: sequence.id, stepNumber: step.stepNumber } },
      create: {
        pidStep: `STEP-CHINA-IMPORT-${String(step.stepNumber).padStart(2, '0')}`,
        sequenceId: sequence.id,
        ...step,
        status: 'ACTIVE',
      },
      update: { ...step, status: 'ACTIVE' },
    });
  }

  const total = await prisma.marketing_sequence_steps.count({ where: { sequenceId: sequence.id } });
  console.log(`Seeded ${sequence.name}: ${total} emails.`);
} finally {
  await prisma.$disconnect();
}
