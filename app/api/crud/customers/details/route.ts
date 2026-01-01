import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pidUser = searchParams.get('pidUser');

    if (!pidUser) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Customer ID is required',
            status: 'VALIDATION_ERROR',
          },
          successx: false,
        },
        { status: 400 }
      );
    }

    // Fetch customer with related data
    const customer = await prisma.users.findUnique({
      where: { pidUser },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            pidOrder: true,
            orderName: true,
            destinationCountry: true,
            orderStatus: true,
            orderTotalCost: true,
            currencyType: true,
            createdAt: true,
          },
        },
        wallets: {
          select: {
            id: true,
            name: true,
            type: true,
            currency: true,
            balance: true,
          },
        },
        accounts: {
          select: {
            id: true,
            accountName: true,
            accountNumber: true,
            bankName: true,
            balance: true,
            currency: true,
          },
        },
        _count: {
          select: {
            orders: true,
            wallets: true,
            accounts: true,
            paysmallsmall: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Customer not found',
            status: 'NOT_FOUND',
          },
          successx: false,
        },
        { status: 404 }
      );
    }

    // Calculate total order value
    const orderStats = await prisma.orders.aggregate({
      where: { pidUser },
      _count: { id: true },
    });

    // Get payments summary
    const payments = await prisma.payments.findMany({
      where: { pidUser },
      select: {
        amount: true,
        currency: true,
        paymentStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const totalPayments = await prisma.payments.aggregate({
      where: {
        pidUser,
        paymentStatus: 'success'
      },
      _sum: { amount: true },
    });

    return NextResponse.json({
      responsex: {
        message: 'Customer details fetched successfully',
        status: 'SUCCESS',
      },
      successx: true,
      data: {
        customer,
        stats: {
          totalOrders: orderStats._count.id,
          totalPayments: totalPayments._sum.amount || 0,
        },
        recentPayments: payments,
      },
    });
  } catch (error: any) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json(
      {
        responsex: {
          message: 'Failed to fetch customer details',
          status: 'ACTION_FAILED',
        },
        successx: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
