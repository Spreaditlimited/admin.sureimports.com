import sequenceData from './data/import-email-sequence-52-weeks.json';
import { prisma } from '@/lib/prisma';

export async function seedChinaImportSequence(createdBy?: string | null) {
  return prisma.$transaction(async (tx) => {
    const sequence = await tx.marketing_sequences.upsert({
      where: { pidSequence: sequenceData.pidSequence },
      create: {
        pidSequence: sequenceData.pidSequence,
        name: sequenceData.name,
        description: sequenceData.description,
        triggerKey: sequenceData.triggerKey,
        cadence: sequenceData.cadence,
        status: 'DRAFT',
        totalSteps: sequenceData.steps.length,
        createdBy: createdBy || null,
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
      await tx.marketing_sequence_steps.upsert({
        where: {
          sequenceId_stepNumber: {
            sequenceId: sequence.id,
            stepNumber: step.stepNumber,
          },
        },
        create: {
          pidStep: `STEP-CHINA-IMPORT-${String(step.stepNumber).padStart(2, '0')}`,
          sequenceId: sequence.id,
          ...step,
          status: 'ACTIVE',
        },
        update: {
          ...step,
          status: 'ACTIVE',
        },
      });
    }

    return tx.marketing_sequences.findUniqueOrThrow({
      where: { id: sequence.id },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
  });
}

