import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {

  const status = request.nextUrl.searchParams.get('status');

  const orderALL = await prisma.orders.findMany({
          take: 20, 
          where: { status }, // Filter by userId   
          orderBy: { updatedAt: 'desc' },
          include: {
            user: true, // Include associated user data
          },
          // select: {
          //     id: true,
          //     pidOrder: true,
          //     pidUser: true,
          //     orderName: true,
          //     destinationCountry: true,
          //     currencyType: true,
          //     shippingPlan: true,
          //     orderCategory: true,
          //     shippingAddress: true,
          //     status: true,
          //     createdAt: true,
          //     products: true,
          // },
          
        });
  return NextResponse.json(orderALL);
}