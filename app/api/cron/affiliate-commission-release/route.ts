import { NextRequest, NextResponse } from 'next/server';
import { releaseMatureAffiliateCommissions } from '@/lib/affiliate/commissionRelease';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  const rawLimit = Number(request.nextUrl.searchParams.get('limit') || 100);
  const limit = Number.isFinite(rawLimit) ? rawLimit : 100;
  try {
    const result = await releaseMatureAffiliateCommissions({ limit });
    return NextResponse.json(
      { status: 'SUCCESS', ...result },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[affiliate-commission-release] failed', error);
    return NextResponse.json({ message: 'Commission release run failed.' }, { status: 500 });
  }
}
