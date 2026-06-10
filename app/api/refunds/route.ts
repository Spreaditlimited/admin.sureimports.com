import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

const REFUNDS_SERVICE_KEY = 'payout_requests';

function parseAmount(value?: string | null) {
  const amount = Number.parseFloat(String(value || '0'));
  return Number.isFinite(amount) ? amount : 0;
}

export async function GET(request: NextRequest) {
  const access = await requireAdminServiceAccess(REFUNDS_SERVICE_KEY, 'view');
  if (!access.ok) return access.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const serviceType = searchParams.get('serviceType')?.trim() || '';

    const userMatches = search
      ? await prisma.users.findMany({
          where: {
            OR: [
              { pidUser: { contains: search } },
              { userEmail: { contains: search } },
              { userFirstname: { contains: search } },
              { userLastname: { contains: search } },
            ],
          },
          select: { pidUser: true },
          take: 100,
        })
      : [];

    const where: Prisma.refund_recordsWhereInput = {};
    if (status) where.refundStatus = status;
    if (serviceType) where.serviceType = serviceType;
    if (search) {
      where.OR = [
        { pidRefund: { contains: search } },
        { pidUser: { contains: search } },
        { pidOrder: { contains: search } },
        { serviceType: { contains: search } },
        { ext1: { contains: search } },
        { ext2: { contains: search } },
        ...userMatches.map((user) => ({ pidUser: user.pidUser })),
      ];
    }

    const [totalCount, allForTotal, refunds, serviceTypes] = await Promise.all([
      prisma.refund_records.count({ where }),
      prisma.refund_records.findMany({ where, select: { amount: true, currency: true } }),
      prisma.refund_records.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.refund_records.findMany({
        distinct: ['serviceType'],
        where: { serviceType: { not: null } },
        select: { serviceType: true },
        orderBy: { serviceType: 'asc' },
      }),
    ]);

    const pidUsers = [...new Set(refunds.map((refund) => refund.pidUser).filter(Boolean))] as string[];
    const users = pidUsers.length
      ? await prisma.users.findMany({
          where: { pidUser: { in: pidUsers } },
          select: {
            pidUser: true,
            userFirstname: true,
            userLastname: true,
            userEmail: true,
            userPhone: true,
            bank_name: true,
            bank_account_number: true,
            bank_account_name: true,
          },
        })
      : [];

    const userMap = new Map(users.map((user) => [user.pidUser, user]));
    const data = refunds.map((refund) => ({
      ...refund,
      customer: refund.pidUser ? userMap.get(refund.pidUser) || null : null,
    }));

    const totalsByCurrency = allForTotal.reduce<Record<string, number>>((totals, item) => {
      const currency = (item.currency || 'NGN').toUpperCase();
      totals[currency] = (totals[currency] || 0) + parseAmount(item.amount);
      return totals;
    }, {});

    return NextResponse.json({
      statusx: 'SUCCESS',
      data,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      perPage: limit,
      totalAmount: totalsByCurrency.NGN || 0,
      totalsByCurrency,
      serviceTypes: serviceTypes.map((item) => item.serviceType).filter(Boolean),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching refunds:', error);
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: 'Failed to fetch refunds',
        error: message,
        data: [],
        totalCount: 0,
        totalPages: 0,
      },
      { status: 500 }
    );
  }
}
