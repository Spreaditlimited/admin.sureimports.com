import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {

  const status = request.nextUrl.searchParams.get('status') as any;

  const orderALL = await prisma.special_sourcing.findMany({
          where: { status: status }, // Filter by userId   
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            pidSpecialSourcing: true,
            productName: true,
            whatsappNumber: true,
            productQualityRatings: true,
            targetUnitPrice: true,
            productDescription: true,
            productImage: true,
            status: true,
            createdAt: true,
          },
        });
  return NextResponse.json(orderALL);
}