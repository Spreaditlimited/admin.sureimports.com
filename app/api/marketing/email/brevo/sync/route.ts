import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { syncBrevoMarketingContact } from '@/lib/marketing/brevoContacts';
import { getMarketingProvider } from '@/lib/marketing/config';

export async function POST(request: Request) {
  const secret = process.env.MARKETING_CONTACT_SYNC_SECRET;
  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret || ''}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (getMarketingProvider() !== 'brevo') return NextResponse.json({ enabled: false });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 }); }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ message: 'Invalid email' }, { status: 400 });
  try {
    // The caller supplies an identifier, never consent. Read consent from the shared ledger.
    return NextResponse.json({ synced: await syncBrevoMarketingContact(email) });
  } catch {
    return NextResponse.json({ message: 'Contact sync failed; reconciliation will retry.' }, { status: 503 });
  }
}
