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
    const savedPaySmallSmall: number = await prisma.paysmallsmall.count({
      where: {
        //pidUser: pidUser,
        status: 'SAVED' as any,
      },
    });

    const startedPaySmallSmall: number = await prisma.paysmallsmall.count({
      where: {
        //pidUser: pidUser,
        status: 'STARTED' as any,
      },
    });

    const completedPaySmallSmall: number = await prisma.paysmallsmall.count({
      where: {
        //pidUser: pidUser,
        status: 'COMPLETED' as any,
      },
    });

    const cancelledPaySmallSmall: number = await prisma.paysmallsmall.count({
      where: {
        //pidUser: pidUser,
        status: 'CANCELLED' as any,
      },
    });


    return NextResponse.json(
      {
        savedPaySmallSmall: savedPaySmallSmall,
        startedPaySmallSmall: startedPaySmallSmall,
        completedPaySmallSmall: completedPaySmallSmall,
        cancelledPaySmallSmall: cancelledPaySmallSmall,
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
