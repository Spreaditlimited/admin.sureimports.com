import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'all'; // all, active, registered

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    // Filter by status
    if (status === 'active') {
      whereClause.userCid = 'VERIFIED';
    } else if (status === 'registered') {
      whereClause.OR = [
        { userCid: { not: 'VERIFIED' } },
        { userCid: null }
      ];
    }

    // Search filter
    if (search) {
      whereClause.AND = [
        {
          OR: [
            { userFirstname: { contains: search } },
            { userLastname: { contains: search } },
            { userEmail: { contains: search } },
            { phone: { contains: search } },
            { userPhone: { contains: search } },
            { country: { contains: search } },
            { userCountry: { contains: search } },
          ],
        },
      ];
    }

    // Get total count
    const totalCount = await prisma.users.count({
      where: whereClause,
    });

    // Get active customers count
    const activeCount = await prisma.users.count({
      where: { userCid: 'VERIFIED' },
    });

    // Get registered (non-verified) count
    const registeredCount = await prisma.users.count({
      where: {
        OR: [
          { userCid: { not: 'VERIFIED' } },
          { userCid: null }
        ]
      },
    });

    // Fetch customers
    const customers = await prisma.users.findMany({
      where: whereClause,
      select: {
        id: true,
        pidUser: true,
        userFirstname: true,
        userLastname: true,
        userEmail: true,
        email: true,
        phone: true,
        userPhone: true,
        country: true,
        userState: true,
        address: true,
        userCid: true,
        userStatus: true,
        userImage: true,
        userAffiliateCode: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            wallets: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      responsex: {
        message: 'Customers fetched successfully',
        status: 'SUCCESS',
      },
      successx: true,
      data: customers,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      stats: {
        total: activeCount + registeredCount,
        active: activeCount,
        registered: registeredCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      {
        responsex: {
          message: 'Failed to fetch customers',
          status: 'ACTION_FAILED',
        },
        successx: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
