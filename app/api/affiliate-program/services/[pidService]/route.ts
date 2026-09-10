import { NextResponse } from 'next/server';
import { requireAffiliateAdmin, trustedAdminRequest } from '@/lib/affiliate/adminAuth';
import { updateAffiliateProgramService } from '@/lib/affiliate/programConfiguration';

export const runtime = 'nodejs';

export async function PATCH(request: Request, context: { params: Promise<{ pidService: string }> }) {
  if (!trustedAdminRequest(request)) return NextResponse.json({ message: 'Request not allowed.' }, { status: 403 });
  const admin = await requireAffiliateAdmin('edit');
  if (!admin) return NextResponse.json({ message: 'You do not have permission to change affiliate services.' }, { status: 403 });
  const { pidService } = await context.params;
  const body = await request.json().catch(() => ({}));
  try {
    return NextResponse.json({ service: await updateAffiliateProgramService(pidService, body, admin.pidUser) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to update affiliate service.' }, { status: 400 });
  }
}
