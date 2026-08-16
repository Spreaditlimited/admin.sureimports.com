import { NextResponse } from 'next/server';

import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { getMarketingProvider, getMarketingProviderLabel } from '@/lib/marketing/config';
import { verifyHostingerMarketingTransport } from '@/lib/marketing/hostinger';

export async function POST() {
  const access = await requireAdminServiceAccess('admin_mgt', 'edit');
  if (!access.ok) return access.response;

  try {
    if (getMarketingProvider() !== 'hostinger') {
      return NextResponse.json({
        statusx: 'SUCCESS',
        message: `${getMarketingProviderLabel()} is configured. SMTP verification is not required.`,
      });
    }
    await verifyHostingerMarketingTransport();
    return NextResponse.json({
      statusx: 'SUCCESS',
      message: 'Hostinger authenticated successfully with insights@sureimports.com.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: error instanceof Error ? error.message : 'Provider verification failed.',
      },
      { status: 400 },
    );
  }
}
