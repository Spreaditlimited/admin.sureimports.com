import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Filter parameters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // Build where clause
    const where: any = {};

    // Search filter (pidPayout, recipient, reference)
    if (search) {
      where.OR = [
        { pidPayout: { contains: search } },
        { recipient: { contains: search } },
        { reference: { contains: search } },
        { pidUser: { contains: search } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    console.log('Where clause:', JSON.stringify(where, null, 2)); // Debug log

    // Get total count for pagination
    const totalCount = await prisma.payoutrequest.count({ where });

    // Calculate total amount for the filtered results
    const totalAmountResult = await prisma.payoutrequest.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    const totalAmount = totalAmountResult._sum.amount || 0;

    // Fetch paginated payout requests
    const payoutRequests = await prisma.payoutrequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        pidPayout: true,
        pidUser: true,
        amount: true,
        recipient: true,
        reference: true,
        reason: true,
        status: true,
        xStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    console.log(`Found ${payoutRequests.length} payout requests, total: ${totalCount}, total amount: ${totalAmount}`); // Debug log

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: payoutRequests,
      totalCount,
      totalPages,
      currentPage: page,
      perPage: limit,
      totalAmount,
    });
  } catch (error: any) {
    console.error('Error fetching payout requests:', error);
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: 'Failed to fetch payout requests',
        error: error.message,
        data: [],
        totalCount: 0,
        totalPages: 0,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

