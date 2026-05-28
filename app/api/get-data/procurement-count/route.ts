// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {
  try {
    const grouped = await prisma.orders.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const normalize = (value: string | null) => (value || '').trim().toLowerCase();
    const statusCounts = new Map<string, number>();
    for (const row of grouped) {
      const key = normalize(row.status);
      statusCounts.set(key, (statusCounts.get(key) || 0) + row._count._all);
    }

    const getCount = (...keys: string[]) =>
      keys.reduce((sum, key) => sum + (statusCounts.get(key) || 0), 0);

    const savedOrderCount = getCount('saved');
    const pendingOrderCount = getCount('pending');
    const approvedOrderCount = getCount('approved');
    const payForShippingOrderCount = getCount('pay-for-shipping');
    const inTransitOrderCount = getCount('in-transit');
    const readyForPickupOrderCount = getCount('ready-for-pickup');
    const completedOrdersCount = getCount('completed');
    const onHoldOrdersCount = getCount('on-hold');
    const bankPendingSavedOrdersCount = getCount('bank-pending-saved-orders');
    const bankPendingShippingOrdersCount = getCount('bank-pending-shipping-orders');
    const cancelledOrdersCount = getCount('cancelled');

    return NextResponse.json(
      {
        savedOrderCount: savedOrderCount,
        pendingOrderCount: pendingOrderCount,
        approvedOrderCount: approvedOrderCount,
        payForShippingOrderCount: payForShippingOrderCount,
        inTransitOrderCount: inTransitOrderCount,
        readyForPickupOrderCount: readyForPickupOrderCount,
        completedOrdersCount: completedOrdersCount,
        onHoldOrdersCount: onHoldOrdersCount,
        bankPendingSavedOrdersCount: bankPendingSavedOrdersCount,
        bankPendingShippingOrdersCount: bankPendingShippingOrdersCount,
        cancelledOrdersCount: cancelledOrdersCount,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
