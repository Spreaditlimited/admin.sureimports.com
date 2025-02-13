// app/api/orders/total/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Assuming you have Prisma setup in `lib/prisma.ts`


export async function GET(request: NextRequest) {

  const pidUser = request.nextUrl.searchParams.get('pidUser');
  const pidProduct = request.nextUrl.searchParams.get('pidProduct');

  try {

    //GET ONE RECORD
    const getOneRecord = await prisma.products.findUnique({
      where: { 
        pidUser: pidUser as string | undefined,
        pidProduct: pidProduct as string | undefined 
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
          getOneRecord: getOneRecord,
    });
  } catch (error) {
    console.error('Error Processing:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
