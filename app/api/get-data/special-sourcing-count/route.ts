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
    const savedOrder: number = await prisma.special_sourcing.count({
      where: {
        //pidUser: pidUser,
        status: 'saved',
      },
    });

    const pendingOrder: number = await prisma.special_sourcing.count({
      where: {
        //pidUser: pidUser,
        status: 'pending',
      },
    });

    const processingOrder: number = await prisma.special_sourcing.count({
      where: {
        //pidUser: pidUser,
        status: 'processing',
      },
    });

    const sourcedOrder: number = await prisma.special_sourcing.count({
      where: {
        //pidUser: pidUser,
        status: 'sourced',
      },
    });

    const deliveredOrder: number = await prisma.special_sourcing.count({
      where: {
        //pidUser: pidUser,
        status: 'delivered',
      },
    });

    const cancelledOrder: number = await prisma.special_sourcing.count({
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
        //savedOrder: savedOrder,
        pendingOrder: pendingOrder,
        processingOrder: processingOrder,
        sourcedOrder: sourcedOrder,
        deliveredOrder: deliveredOrder,
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
