import { NextResponse } from 'next/server';
import { requireAffiliatePayoutAdmin, trustedAdminRequest } from '@/lib/affiliate/adminAuth';
import { cancelAffiliatePayout } from '@/lib/affiliate/payoutOperations';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ pidPayout: string }> }) {
  if (!trustedAdminRequest(request)) return NextResponse.json({ message: 'Request not allowed.' }, { status: 403 });
  const admin = await requireAffiliatePayoutAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  const { pidPayout } = await context.params;
  try {
    await cancelAffiliatePayout(pidPayout, admin.userEmail || admin.pidUser);
    return NextResponse.json({ status: 'CANCELLED' });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Payout cancellation failed.' }, { status: 400 });
  }
}
