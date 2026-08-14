import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { prisma } from '@/lib/prisma';
import { sendSequenceStep } from '@/lib/marketing/operations';

export async function POST(request: Request) {
  const access = await requireAdminServiceAccess('admin_mgt', 'edit');
  if (!access.ok) return access.response;
  try {
    const body = await request.json();
    const step = await prisma.marketing_sequence_steps.findUnique({ where: { pidStep: String(body.pidStep || '') } });
    if (!step) return NextResponse.json({ message: 'Sequence step not found.' }, { status: 404 });
    const delivery = await sendSequenceStep({
      stepId: step.id, email: String(body.email || ''), firstName: body.firstName,
      idempotencyKey: `manual:${step.pidStep}:${String(body.email || '').toLowerCase()}:${randomUUID()}`,
    });
    return NextResponse.json({ statusx: 'SUCCESS', delivery });
  } catch (error) {
    return NextResponse.json({ statusx: 'ERROR', message: error instanceof Error ? error.message : 'Send failed.' }, { status: 400 });
  }
}
