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
    const pendingPaymentOrder: number = await prisma.verify_supplier.count({
      where: {
        //pidUser: pidUser,
        status: 'pending-payment',
      },
    });

    const processingRequestOrder: number = await prisma.verify_supplier.count({
      where: {
        //pidUser: pidUser,
        status: 'processing-request',
      },
    });

    const requestProcessedOrder: number = await prisma.verify_supplier.count({
      where: {
        //pidUser: pidUser,
        status: 'request-processed',
      },
    });

    const cancelledOrder: number = await prisma.verify_supplier.count({
      where: {
        //pidUser: pidUser,
        status: 'cancelled',
      },
    });

    // const recordx = {
    //       savedOrder: savedOrder,
    //       pendingdOrder: pendingOrder,
    //       processingOrder: processingOrder,
    //       sourcedOrder: sourcedOrder,
    //       deliveredOrder: deliveredOrder,
    // };

    return NextResponse.json(
      {
        pendingPaymentOrder: pendingPaymentOrder,
        processingRequestOrder: processingRequestOrder,
        requestProcessedOrder: requestProcessedOrder,
        cancelledOrder: cancelledOrder,
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
