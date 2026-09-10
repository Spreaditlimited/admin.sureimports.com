import { NextResponse } from 'next/server';
import { requireAffiliateAdmin, trustedAdminRequest } from '@/lib/affiliate/adminAuth';
import { createAffiliateProgramService, listAffiliateProgramServices } from '@/lib/affiliate/programConfiguration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAffiliateAdmin('view'))) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  return NextResponse.json({ services: await listAffiliateProgramServices() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!trustedAdminRequest(request)) return NextResponse.json({ message: 'Request not allowed.' }, { status: 403 });
  const admin = await requireAffiliateAdmin('edit');
  if (!admin) return NextResponse.json({ message: 'You do not have permission to change affiliate services.' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  try {
    return NextResponse.json({ service: await createAffiliateProgramService(body, admin.pidUser) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to create affiliate service.' }, { status: 400 });
  }
}
