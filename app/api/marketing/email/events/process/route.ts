import { NextResponse } from 'next/server';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { processMarketingEventQueue } from '@/lib/marketing/events';

export async function POST() {
  const access = await requireAdminServiceAccess('admin_mgt', 'edit');
  if (!access.ok) return access.response;
  return NextResponse.json({ statusx: 'SUCCESS', ...(await processMarketingEventQueue()) });
}
