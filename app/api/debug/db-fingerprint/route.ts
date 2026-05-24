import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = verifyToken(token);
    if (!payload || typeof payload !== 'object' || !('pidUser' in payload)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.admin.findUnique({
      where: { pidUser: payload.pidUser as string },
      select: { pidUser: true, userEmail: true },
    });

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const metaRows = await prisma.$queryRaw<
      Array<{ databaseName: string | null; hostName: string | null }>
    >`SELECT DATABASE() AS databaseName, @@hostname AS hostName`;

    const corporateGiftCount = await prisma.corporate_gift_request.count();
    const meta = metaRows[0] || { databaseName: null, hostName: null };

    return NextResponse.json(
      {
        ok: true,
        user,
        databaseName: meta.databaseName,
        hostName: meta.hostName,
        corporateGiftCount,
        runtime: {
          nodeEnv: process.env.NODE_ENV || null,
          vercelEnv: process.env.VERCEL_ENV || null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('DB fingerprint error:', error);
    return NextResponse.json(
      { ok: false, message: 'Failed to load DB fingerprint' },
      { status: 500 },
    );
  }
}
