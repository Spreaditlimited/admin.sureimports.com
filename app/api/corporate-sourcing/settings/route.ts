import { NextResponse } from 'next/server';

import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import {
  getCorporateSourcingPricing,
  updateCorporateSourcingPricing,
} from '@/lib/corporateSourcing/pricing';

export async function GET() {
  const access = await requireAdminServiceAccess('corporate_gifts', 'view');
  if (!access.ok) return access.response;
  return NextResponse.json({ success: true, data: await getCorporateSourcingPricing() });
}

export async function PATCH(request: Request) {
  const access = await requireAdminServiceAccess('corporate_gifts', 'edit');
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({}));
  const priceNaira = Math.round(Number(body.priceNaira));
  const priceUsdCents = Math.round(Number(body.priceUsdCents));
  if (!Number.isFinite(priceNaira) || priceNaira < 1 || !Number.isFinite(priceUsdCents) || priceUsdCents < 1) {
    return NextResponse.json({ success: false, message: 'Enter valid naira and dollar fees.' }, { status: 400 });
  }
  const data = await updateCorporateSourcingPricing(priceNaira, priceUsdCents);
  return NextResponse.json({ success: true, data });
}
