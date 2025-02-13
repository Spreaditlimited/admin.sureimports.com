
import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {

  const status = request.nextUrl.searchParams.get('status') as any;

  const orderALL = await prisma.verify_supplier.findMany({
          where: { status: status }, // Filter by userId   
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            pidVerifySupplier: true,
            pidUser: true,
            supplierName: true,
            supplierPhone: true,
            supplierAddress: true,
            supplierProduct: true,
            supplierDetails: true,
            supplierWebsite: true,
            status: true,
            xStatus: true,
            createdAt: true,
          },
        });
  return NextResponse.json(orderALL);
}