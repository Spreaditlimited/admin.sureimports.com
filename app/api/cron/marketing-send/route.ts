import { NextResponse } from 'next/server';

import { getMarketingProvider } from '@/lib/marketing/config';
import { processFiveDaySandboxTest } from '@/lib/marketing/sandboxTestRun';
import { processMarketingSequence } from '@/lib/marketing/sequenceRun';

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(
      getMarketingProvider() === 'hostinger'
        ? await processMarketingSequence()
        : await processFiveDaySandboxTest(),
    );
  } catch (error) {
    console.error('Marketing send cron failed', error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Marketing send failed.',
      },
      { status: 500 },
    );
  }
}
