import { NextResponse } from 'next/server';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { seedChinaImportSequence } from '@/lib/marketing/sequenceSeed';

export async function POST() {
  const access = await requireAdminServiceAccess('admin_mgt', 'edit');
  if (!access.ok) return access.response;
  const sequence = await seedChinaImportSequence(access.admin.pidUser);
  return NextResponse.json({ statusx: 'SUCCESS', sequence });
}
