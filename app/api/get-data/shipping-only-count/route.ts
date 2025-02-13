// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import { getR2Client } from '@/app/utils/r2Client';
import { Upload } from '@aws-sdk/lib-storage';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {

  const status = request.nextUrl.searchParams.get('status');

  try {
    const requestReceivedOrder: number = await prisma.shipping_only.count({
      where: {
        //pidUser: pidUser,
        status: 'request-received',
      },
    });

    const readyToShipOrder: number = await prisma.shipping_only.count({
      where: {
        //pidUser: pidUser,
        status: 'ready-to-ship',
      },
    });

    const productShippedOrder: number = await prisma.shipping_only.count({
      where: {
        //pidUser: pidUser,
        status: 'product-shipped',
      },
    });

    const productArrivedOrder: number = await prisma.shipping_only.count({
      where: {
        //pidUser: pidUser,
        status: 'product-arrived',
      },
    });

    const productDeliveredOrder: number = await prisma.shipping_only.count({
      where: {
        //pidUser: pidUser,
        status: 'product-delivered',
      },
    });

    const cancelledRequestOrder: number = await prisma.shipping_only.count({
      where: {
        //pidUser: pidUser,
        status: 'cancelled-request',
      },
    });


    
    return NextResponse.json(
      {
        requestReceivedOrder: requestReceivedOrder,
        readyToShipOrder: readyToShipOrder,
        productShippedOrder: productShippedOrder,
        productArrivedOrder: productArrivedOrder,
        productDeliveredOrder: productDeliveredOrder,
        cancelledRequestOrder: cancelledRequestOrder,
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
