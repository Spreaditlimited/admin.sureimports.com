import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

import { readRefundDestination } from '@/lib/refunds/destination';

const REFUNDS_SERVICE_KEY = 'refunds';

function parseAmount(value?: string | null) {
  const amount = Number.parseFloat(String(value || '0'));
  return Number.isFinite(amount) ? amount : 0;
}

export async function GET(request: NextRequest) {
  const access = await requireAdminServiceAccess(REFUNDS_SERVICE_KEY, 'view');
  if (!access.ok) return access.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Math.min(100000, Number.parseInt(searchParams.get('page') || '1', 10) || 1));
    const limit = Math.max(1, Math.min(100, Number.parseInt(searchParams.get('limit') || '10', 10) || 10));
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

    const foreignIds = refunds.map(r => r.pidRefund);
    const settlements = foreignIds.length ? await prisma.$queryRaw<Array<Record<string, any>>>`SELECT * FROM refund_settlements WHERE refundId IN (${Prisma.join(foreignIds)})` : [];
    const providerLegs = foreignIds.length ? await prisma.$queryRaw<Array<{ id: string; refundId: string; currency: string; amount: string; status: string; providerReference: string | null; firstAttemptAt: Date | null }>>`SELECT id,refundId,currency,amount,status,providerReference,firstAttemptAt FROM refund_provider_legs WHERE refundId IN (${Prisma.join(foreignIds)}) ORDER BY id` : [];
    const settlementMap = new Map(settlements.map(s => {
      const { destinationCiphertext, ...safe } = s;
      return [s.refundId, { ...safe, destination: s.method === 'BANK' ? readRefundDestination(destinationCiphertext, s.refundId) : {} }];
    }));
    const userMap = new Map(users.map((user) => [user.pidUser, user]));
    const data = refunds.map((refund) => ({
      ...refund,
      settlement: settlementMap.get(refund.pidRefund) || null,
      providerLegs: providerLegs.filter(leg => leg.refundId === refund.pidRefund),
      currency: refund.currency || 'UNSPECIFIED',
      customer: refund.pidUser ? userMap.get(refund.pidUser) || null : null,
    }));

    const settlementSummary = await prisma.$queryRaw<Array<{ settlementCurrency: string; method: string; settledAmount: string; outstandingAmount: string; count: bigint }>>`SELECT settlementCurrency,method,SUM(CASE WHEN status='SETTLED' THEN settlementAmount ELSE 0 END) settledAmount,SUM(CASE WHEN status<>'SETTLED' THEN settlementAmount ELSE 0 END) outstandingAmount,COUNT(*) count FROM (SELECT settlementCurrency,method,settlementAmount,status FROM refund_settlements UNION ALL SELECT currency settlementCurrency,CONCAT('PARTNER_',provider) method,amountMinor/100 settlementAmount,status FROM partner_adjustment_refunds WHERE status<>'SUPERSEDED') combined GROUP BY settlementCurrency,method ORDER BY settlementCurrency,method`;
    const externalReviews = await prisma.$queryRaw<Array<{ id: string; detailsJson: string; createdAt: Date }>>`SELECT e.id,e.detailsJson,e.createdAt FROM refund_events e WHERE e.eventType='EXTERNAL_PAYPAL_REFUND' AND NOT EXISTS (SELECT 1 FROM refund_events resolved WHERE resolved.id=CONCAT('RESOLVED:',e.id)) ORDER BY e.createdAt DESC LIMIT 100`;
    const totalsByCurrency = allForTotal.reduce<Record<string, number>>((totals, item) => {
      const currency = (item.currency || 'UNSPECIFIED').toUpperCase();
      totals[currency] = (totals[currency] || 0) + Math.round(parseAmount(item.amount) * 100) / 100;
      return totals;
    }, {});

    return NextResponse.json({
      statusx: 'SUCCESS',
      externalReviews: externalReviews.map(row => ({ id: row.id, createdAt: row.createdAt, ...JSON.parse(row.detailsJson) })),
      data,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      perPage: limit,
      totalAmount: totalsByCurrency.NGN || 0,
      totalsByCurrency,
      settlementSummary: settlementSummary.map(row => ({ ...row, count: Number(row.count), settledAmount: Number(row.settledAmount), outstandingAmount: Number(row.outstandingAmount) })),
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
