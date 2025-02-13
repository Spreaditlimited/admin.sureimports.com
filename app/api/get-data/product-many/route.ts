import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {

  const pidOrder = request.nextUrl.searchParams.get('pidOrder') as any;

  const orderALL = await prisma.products.findMany({
          where: { pidOrder: pidOrder }, // Filter by userId   
          orderBy: { createdAt: 'desc' },
          select: {
              id: true,
              pidProduct: true,
              pidOrder: true,
              pidUser: true,
              productName: true,
              productLink: true,
              productCategory: true,
              productPrice: true,
              productWeight: true,
              productQuantity: true,
              productInfo: true,
              productStatus: true,
          },
        });
  return NextResponse.json(orderALL);
}