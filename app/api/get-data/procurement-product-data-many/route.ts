// app/api/orders/total/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assuming you have Prisma setup in `lib/prisma.ts`


export async function GET(request: NextRequest) {

  const pidUser = request.nextUrl.searchParams.get('pidUser');
  const limit = request.nextUrl.searchParams.get('limit');

  try {

    //PRODUCTS GET ALL RECORDS
    const getManyRecords = await prisma.products.findMany({
      where: {
        pidUser: pidUser as string | undefined,
      },
      take: 200,
      orderBy: {
          createdAt: 'asc'
      },
      select: {
        id: true,
        pidUser: true,
        pidProduct: true,
        pidOrder: true,
        productName: true,
        productLink: true,
        productCategory: true,
        productPrice: true,
        productWeight: true,
        productQuantity: true,
        productInfo: true,
        createdAt: true,
  },
    });

    console.log('JESUS CHRIST IS GREAT!!!');

    return NextResponse.json({
          getManyRecords: getManyRecords,

    });
  } catch (error) {
    console.error('Error Processing:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
