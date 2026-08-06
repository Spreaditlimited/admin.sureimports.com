import { NextResponse } from 'next/server';
import sendEmail from '@/lib/email/config/sendEmail';
import { SOCIAL_APPROVAL_EMAIL, SOCIAL_STUDIO_ENABLED } from '@/lib/social/config';
import { generateDailySocialCampaign } from '@/lib/social/generator';

export const maxDuration = 300;
function authorised(request: Request) { const secret = process.env.CRON_SECRET; return !!secret && request.headers.get('authorization') === `Bearer ${secret}`; }
export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!SOCIAL_STUDIO_ENABLED) return NextResponse.json({ skipped: true, reason: 'Social Studio is paused.' });
  try { return NextResponse.json(await generateDailySocialCampaign()); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try { await sendEmail(SOCIAL_APPROVAL_EMAIL, 'Social Studio generation failed', `<p>The daily campaign could not be generated.</p><p>${message}</p>`); } catch {}
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
