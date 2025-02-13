
import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {

  const status = request.nextUrl.searchParams.get('status') as any;

  const orderALL = await prisma.shipping_only.findMany({
          where: { status: status }, // Filter by userId   
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            pidShippingOnly: true,
            pidUser: true,
            whatsappNumber: true,
            shippingName: true,
            shippingTo: true,
            grossWeight: true,
            trackingNumber: true,
            shippingPlan: true,
            wantProductVerification: true,
            wantConsolidation: true,
            multipleSuppliers: true,
            description: true,
            status: true,
            createdAt: true,
          },
        });
  return NextResponse.json(orderALL);
}