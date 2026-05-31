import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, unauthorized } from '@/app/api/invoicing/_lib/invoicing';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pidShippingOnly: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { pidShippingOnly } = await params;
    const requestRecord = await prisma.shipping_only.findUnique({
      where: { pidShippingOnly },
    });

    if (!requestRecord) {
      return NextResponse.json(
        { statusx: 'ERROR', message: 'Shipping only request not found' },
        { status: 404 },
      );
    }

    const matchedUsers = requestRecord.pidUser
      ? await prisma.users.findMany({
          where: { pidUser: requestRecord.pidUser },
          select: {
            pidUser: true,
            userFirstname: true,
            userLastname: true,
            userEmail: true,
            userPhone: true,
          },
          take: 1,
        })
      : [];

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: {
        request: requestRecord,
        matchedUsers,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to fetch shipping-only prefill', error: error.message },
      { status: 500 },
    );
  }
}
