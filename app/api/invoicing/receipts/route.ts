import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, unauthorized } from '../_lib/invoicing';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { searchParams } = new URL(request.url);
    const pidInvoice = searchParams.get('pidInvoice') || '';
    const search = searchParams.get('search') || '';
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '20');

    const where: any = {};
    if (pidInvoice) where.pidInvoice = pidInvoice;
    if (search) {
      where.OR = [
        { receiptNumber: { contains: search } },
        { pidReceipt: { contains: search } },
        { pidInvoice: { contains: search } },
      ];
    }

    const skip = (Math.max(page, 1) - 1) * Math.max(limit, 1);
    const take = Math.min(Math.max(limit, 1), 100);

    const [data, totalCount] = await Promise.all([
      prisma.receipts.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
        skip,
        take,
        include: {
          invoice: {
            select: {
              pidInvoice: true,
              invoiceNumber: true,
              customerName: true,
              customerEmail: true,
              currency: true,
            },
          },
          payment: {
            select: {
              pidInvoicePayment: true,
              paymentMethod: true,
              reference: true,
              paidAt: true,
            },
          },
        },
      }),
      prisma.receipts.count({ where }),
    ]);

    return NextResponse.json({
      statusx: 'SUCCESS',
      data,
      pagination: {
        page,
        limit: take,
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to fetch receipts', error: error.message },
      { status: 500 },
    );
  }
}
