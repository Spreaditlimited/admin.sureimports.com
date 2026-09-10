import { NextResponse } from 'next/server';
import { requireAffiliatePayoutAdmin } from '@/lib/affiliate/adminAuth';
import { listAffiliatePayoutOperations } from '@/lib/affiliate/payoutOperations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAffiliatePayoutAdmin())) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  return NextResponse.json({ payouts: await listAffiliatePayoutOperations() }, { headers: { 'Cache-Control': 'no-store' } });
}
