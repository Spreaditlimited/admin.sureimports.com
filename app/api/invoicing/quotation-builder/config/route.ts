import { NextResponse } from 'next/server';

import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { getQuotationRateDefaults } from '@/lib/quotation-builder/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await requireAdminServiceAccess('invoicing', 'view');
  if (!access.ok) return access.response;
  try {
    return NextResponse.json({ statusx: 'SUCCESS', data: await getQuotationRateDefaults() });
  } catch (error) {
    return NextResponse.json(
      { statusx: 'ERROR', message: error instanceof Error ? error.message : 'Could not load quotation configuration.' },
      { status: 500 },
    );
  }
}
