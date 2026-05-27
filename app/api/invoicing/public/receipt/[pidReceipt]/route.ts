import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureInvoicingCoreTables } from '../../../_lib/invoicing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pidReceipt: string }> },
) {
  try {
    await ensureInvoicingCoreTables();
    const { pidReceipt } = await params;
    const accessToken = request.nextUrl.searchParams.get('accessToken') || '';

    if (!accessToken) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Access token is required' }, { status: 400 });
    }

    const token = await prisma.invoice_access_tokens.findUnique({
      where: { accessToken },
      include: { invoice: true },
    });

    if (!token || token.revokedAt || token.expiresAt < new Date()) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invalid or expired access token' }, { status: 404 });
    }

    const receipt = await prisma.receipts.findUnique({
      where: { pidReceipt },
      include: {
        invoice: {
          include: {
            items: { orderBy: { lineNo: 'asc' } },
          },
        },
        payment: true,
      },
    });

    if (!receipt) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Receipt not found' }, { status: 404 });
    }

    if (receipt.pidInvoice !== token.pidInvoice) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Receipt does not match invoice token' }, { status: 403 });
    }

    await prisma.invoice_access_tokens.update({
      where: { accessToken },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: {
        token: {
          accessToken: token.accessToken,
          expiresAt: token.expiresAt,
        },
        receipt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to load receipt', error: error.message },
      { status: 500 },
    );
  }
}
