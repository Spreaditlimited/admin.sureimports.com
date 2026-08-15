import { NextResponse } from 'next/server';

import { processFiveDaySandboxTest } from '@/lib/marketing/sandboxTestRun';

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await processFiveDaySandboxTest());
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
