import { NextResponse } from 'next/server';
import { requireAffiliatePayoutAdmin, trustedAdminRequest } from '@/lib/affiliate/adminAuth';
import { reconcileAffiliatePayout } from '@/lib/affiliate/payoutOperations';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ pidPayout: string }> }) {
  if (!trustedAdminRequest(request)) return NextResponse.json({ message: 'Request not allowed.' }, { status: 403 });
  if (!(await requireAffiliatePayoutAdmin())) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  const { pidPayout } = await context.params;
  try {
    return NextResponse.json({ result: await reconcileAffiliatePayout(pidPayout) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Payout reconciliation failed.' }, { status: 400 });
  }
}
