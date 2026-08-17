import { NextRequest, NextResponse } from 'next/server';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ pidOrder: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const access = await requireAdminServiceAccess('procurement', 'edit');
  if (!access.ok) return access.response;

  const { pidOrder } = await context.params;
  const orderId = pidOrder.trim();
  if (!orderId) {
    return NextResponse.json(
      { statusx: 'INVALID_ORDER', message: 'Order ID is required.' },
      { status: 400 },
    );
  }

  const admin = await prisma.admin.findUnique({
    where: { pidUser: access.admin.pidUser },
    select: {
      pidUser: true,
      userFirstname: true,
      userLastname: true,
      userEmail: true,
    },
  });
  if (!admin) {
    return NextResponse.json(
      { statusx: 'UNAUTHORIZED', message: 'Admin account was not found.' },
      { status: 401 },
    );
  }

  const claimedAt = new Date();
  const claimResult = await prisma.orders.updateMany({
    where: {
      pidOrder: orderId,
      status: 'pending',
      pidAdmin: null,
    },
    data: {
      pidAdmin: admin.pidUser,
      claimedAt,
    },
  });

  if (claimResult.count === 0) {
    const order = await prisma.orders.findUnique({
      where: { pidOrder: orderId },
      select: { status: true, pidAdmin: true },
    });

    if (!order) {
      return NextResponse.json(
        { statusx: 'NOT_FOUND', message: 'Order was not found.' },
        { status: 404 },
      );
    }
    if (order.status !== 'pending') {
      return NextResponse.json(
        { statusx: 'INVALID_STATUS', message: 'Only pending orders can be claimed.' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { statusx: 'ALREADY_CLAIMED', message: 'This order has already been claimed.' },
      { status: 409 },
    );
  }

  const adminName = [admin.userFirstname, admin.userLastname]
    .filter(Boolean)
    .join(' ')
    .trim() || admin.userEmail;

  return NextResponse.json({
    statusx: 'SUCCESS',
    message: 'Order claimed successfully.',
    claim: {
      pidAdmin: admin.pidUser,
      adminName,
      claimedAt: claimedAt.toISOString(),
    },
  });
}
