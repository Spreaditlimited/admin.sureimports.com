import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status') || '';

  const savedStatuses = ['saved', 'bank-pending-saved-orders'];
  if (savedStatuses.includes(status)) {
    const orphanOrders = await prisma.orders.findMany({
      where: {
        status,
        products: { none: {} },
      },
      select: { pidOrder: true },
    });

    if (orphanOrders.length > 0) {
      await prisma.orders.deleteMany({
        where: {
          pidOrder: { in: orphanOrders.map((row) => row.pidOrder) },
        },
      });
    }
  }

  const orderALL = await prisma.orders.findMany({
    take: 50,
    where: {
      status,
      products: { some: {} },
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      user: true,
    },
  });

  return NextResponse.json(orderALL, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
