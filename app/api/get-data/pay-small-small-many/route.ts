
import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {

  const status = request.nextUrl.searchParams.get('status');

  const orderALL = await prisma.paysmallsmall.findMany({
          where: { status: status as any }, // Filter by userId   
          include: {
            store: true,
            users: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

  return NextResponse.json(orderALL);
}