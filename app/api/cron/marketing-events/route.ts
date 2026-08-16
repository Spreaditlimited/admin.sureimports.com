import { NextResponse } from 'next/server';
import { getMarketingProvider } from '@/lib/marketing/config';
import { processMarketingEventQueue } from '@/lib/marketing/events';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (getMarketingProvider() !== 'ses') {
    return NextResponse.json({ enabled: false, provider: getMarketingProvider(), processed: 0 });
  }
  return NextResponse.json(await processMarketingEventQueue());
}
