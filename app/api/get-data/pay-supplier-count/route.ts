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
    const savedOrder: number = await prisma.pay_supplier.count({
      where: {
        //pidUser: pidUser,
        status: 'saved',
      },
    });

    const paymentPendingOrder: number = await prisma.pay_supplier.count({
      where: {
        //pidUser: pidUser,
        status: 'pending-payment',
      },
    });

    const paidSupplierOrder: number = await prisma.pay_supplier.count({
      where: {
        //pidUser: pidUser,
        status: 'paid-supplier',
      },
    });

    const cancelledOrder: number = await prisma.pay_supplier.count({
      where: {
        //pidUser: pidUser,
        status: 'cancelled',
      }, 
    });

    return NextResponse.json(
      {
        //savedOrder: savedOrder,
        savedOrder: savedOrder,
        paymentPendingOrder: paymentPendingOrder,
        paidSupplierOrder: paidSupplierOrder,
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
