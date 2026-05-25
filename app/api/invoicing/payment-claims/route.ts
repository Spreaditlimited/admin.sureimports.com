import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureInvoicingCoreTables, requireAdmin, unauthorized } from '../_lib/invoicing';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();
    await ensureInvoicingCoreTables();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const where: any = {};
    if (status) where.status = status;

    const claims = await prisma.invoice_payment_claims.findMany({
      where,
      orderBy: { claimedAt: 'desc' },
      include: {
        invoice: {
          select: {
            pidInvoice: true,
            invoiceNumber: true,
            customerName: true,
            customerEmail: true,
            currency: true,
            grandTotal: true,
            amountPaid: true,
            balanceDue: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ statusx: 'SUCCESS', data: claims });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to fetch payment claims', error: error.message }, { status: 500 });
  }
}
