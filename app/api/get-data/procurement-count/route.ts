// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {

  const status = request.nextUrl.searchParams.get('status');

  try {
    const savedOrderCount: number = await prisma.orders.count({
      where: {
        //pidUser: pidUser,
        status: 'saved',
      },
    });

    const pendingOrderCount: number = await prisma.orders.count({
      where: {
        //pidUser: pidUser,
        status: 'pending',
      },
    });

    const approvedOrderCount: number = await prisma.orders.count({
      where: {
        //pidUser: pidUser,
        status: 'approved',
      },
    });

    const payForShippingOrderCount: number = await prisma.orders.count({
      where: {
        //pidUser: pidUser,
        status: 'pay-for-shipping',
      },
    });

    const inTransitOrderCount: number = await prisma.orders.count({
      where: {
        //pidUser: pidUser,
        status: 'in-transit',
      },
    });

    const readyForPickupOrderCount: number = await prisma.orders.count({
      where: {
        //pidUser: pidUser,
        status: 'ready-for-pickup',
      },
    });

    const completedOrdersCount: number = await prisma.orders.count({
      where: {
        //pidUser: pidUser,
        status: 'completed',
      },
    });

    const onHoldOrdersCount: number = await prisma.orders.count({
      where: {
        //pidUser: pidUser,
        status: 'on-hold',
      },
    });

    const bankPendingSavedOrdersCount: number = await prisma.orders.count({
      where: {
        //pidUser: pidUser,
        status: 'bank-pending-saved-orders',
      },
    });

    const bankPendingShippingOrdersCount: number = await prisma.orders.count({
      where: {
        //pidUser: pidUser,
        status: 'bank-pending-shipping-orders',
      },
    });

    const cancelledOrdersCount: number = await prisma.orders.count({
      where: {
        //pidUser: pidUser,
        status: 'cancelled',
      },
    });

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
