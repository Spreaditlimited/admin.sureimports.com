import { NextResponse } from 'next/server';
import sendEmail from '@/lib/email/config/sendEmail';
import { SOCIAL_APPROVAL_EMAIL } from '@/lib/social/config';
import { publishDueSocialCampaigns } from '@/lib/social/meta';

export const maxDuration = 120;
function authorised(request: Request) { const secret = process.env.CRON_SECRET; return !!secret && request.headers.get('authorization') === `Bearer ${secret}`; }
export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const results = await publishDueSocialCampaigns();
    const failures = results.filter((item) => item.status === 'failed' || item.status === 'partial');
    if (failures.length) { try { await sendEmail(SOCIAL_APPROVAL_EMAIL, 'Social Studio publishing needs attention', `<p>One or more campaigns did not publish to both platforms.</p><pre>${JSON.stringify(failures, null, 2)}</pre>`); } catch {} }
    return NextResponse.json({ results });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}
