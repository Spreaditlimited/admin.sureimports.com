import { NextResponse } from 'next/server';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { requestSandboxRecipientVerification } from '@/lib/marketing/ses';

export async function POST(request: Request) {
  const access = await requireAdminServiceAccess('admin_mgt', 'edit');
  if (!access.ok) return access.response;
  try {
    const body = await request.json();
    const result = await requestSandboxRecipientVerification(String(body.email || ''));
    return NextResponse.json({ statusx: 'SUCCESS', ...result });
  } catch (error) {
    return NextResponse.json({ statusx: 'ERROR', message: error instanceof Error ? error.message : 'Verification request failed.' }, { status: 400 });
  }
}
