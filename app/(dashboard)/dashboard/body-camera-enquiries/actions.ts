'use server';

import { revalidatePath } from 'next/cache';

import { requireBodyCameraEditAccess } from '@/lib/bodyCameraAccess';
import { prisma } from '@/lib/prisma';

const allowedStatuses = new Set([
  'new',
  'contacted',
  'qualified',
  'quotation_prepared',
  'won',
  'lost',
  'archived',
]);

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value || '').trim().slice(0, max);
}

export async function updateBodyCameraEnquiryAction(formData: FormData) {
  const admin = await requireBodyCameraEditAccess();
  const pidEnquiry = clean(formData.get('pidEnquiry'), 80);
  const status = clean(formData.get('status'), 40);
  const assignedOwner = clean(formData.get('assignedOwner'), 160);
  const internalNotes = clean(formData.get('internalNotes'), 10000);

  if (!pidEnquiry || !allowedStatuses.has(status)) {
    throw new Error('Invalid body camera enquiry update.');
  }

  const existing = await prisma.body_camera_enquiries.findUnique({
    where: { pidEnquiry },
    select: { status: true },
  });
  if (!existing) throw new Error('Body camera enquiry not found.');

  const owner =
    assignedOwner ||
    [admin.userFirstname, admin.userLastname].filter(Boolean).join(' ') ||
    admin.userEmail;

  await prisma.body_camera_enquiries.update({
    where: { pidEnquiry },
    data: {
      status,
      assignedOwner: owner,
      internalNotes: internalNotes || null,
      handledAt:
        status === 'new'
          ? null
          : existing.status === 'new'
            ? new Date()
            : undefined,
    },
  });

  revalidatePath('/dashboard/body-camera-enquiries');
}
