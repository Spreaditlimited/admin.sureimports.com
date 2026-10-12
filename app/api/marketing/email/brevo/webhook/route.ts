import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { recordBrevoEvent } from '@/lib/marketing/brevoEvents';

export async function POST(request: Request) {
  const secret = process.env.BREVO_MARKETING_WEBHOOK_SECRET;
  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret || ''}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 }); }
  const events = Array.isArray(body) ? body : [body];
  if (events.length > 100 || events.some((event) => !event || typeof event !== 'object' || Array.isArray(event))) {
    return NextResponse.json({ message: 'Invalid events' }, { status: 400 });
  }
  try {
    let processed = 0;
    for (const event of events) if (await recordBrevoEvent(event)) processed++;
    return NextResponse.json({ processed });
  } catch {
    return NextResponse.json({ message: 'Event processing failed; retry.' }, { status: 503 });
  }
}
