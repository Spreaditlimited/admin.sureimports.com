import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, unauthorized } from '@/app/api/invoicing/_lib/invoicing';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pidRequest: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { pidRequest } = await params;
    const requestRecord = await prisma.corporate_gift_request.findUnique({
      where: { pidRequest },
    });

    if (!requestRecord) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Corporate gift request not found' }, { status: 404 });
    }

    const matchedUsers = await prisma.users.findMany({
      where: {
        OR: [
          { userEmail: requestRecord.contactEmail },
          { email: requestRecord.contactEmail },
        ],
      },
      select: {
        pidUser: true,
        userFirstname: true,
        userLastname: true,
        userEmail: true,
        userPhone: true,
      },
      take: 10,
    });

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: {
        request: requestRecord,
        matchedUsers,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to fetch corporate gift prefill', error: error.message },
      { status: 500 },
    );
  }
}
