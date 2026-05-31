// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup
import { getShippingOnlyStatusVariantsForFilter } from '@/lib/shippingOnlyStatus';

export async function GET(request: NextRequest) {

  const status = request.nextUrl.searchParams.get('status');

  try {
    const requestReceivedOrder: number = await prisma.shipping_only.count({
      where: {
        status: { in: getShippingOnlyStatusVariantsForFilter('request-received') },
      },
    });

    const productShippedOrder: number = await prisma.shipping_only.count({
      where: {
        status: { in: getShippingOnlyStatusVariantsForFilter('product-shipped') },
      },
    });

    const productArrivedOrder: number = await prisma.shipping_only.count({
      where: {
        status: { in: getShippingOnlyStatusVariantsForFilter('product-arrived') },
      },
    });

    const invoicedOrder: number = await prisma.shipping_only.count({
      where: {
        status: { in: getShippingOnlyStatusVariantsForFilter('invoiced') },
      },
    });

    const paidOrder: number = await prisma.shipping_only.count({
      where: {
        status: { in: getShippingOnlyStatusVariantsForFilter('paid') },
      },
    });

    const productDeliveredOrder: number = await prisma.shipping_only.count({
      where: {
        status: { in: getShippingOnlyStatusVariantsForFilter('product-delivered') },
      },
    });

    const cancelledRequestOrder: number = await prisma.shipping_only.count({
      where: {
        status: { in: getShippingOnlyStatusVariantsForFilter('request-cancelled') },
      },
    });


    
    return NextResponse.json(
      {
        requestReceivedOrder: requestReceivedOrder,
        productShippedOrder: productShippedOrder,
        productArrivedOrder: productArrivedOrder,
        invoicedOrder: invoicedOrder,
        paidOrder: paidOrder,
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
