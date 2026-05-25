import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureInvoicingCoreTables } from '../../../_lib/invoicing';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accessToken: string }> },
) {
  try {
    await ensureInvoicingCoreTables();
    const { accessToken } = await params;

    const token = await prisma.invoice_access_tokens.findUnique({
      where: { accessToken },
      include: {
        invoice: {
          include: {
            items: { orderBy: { lineNo: 'asc' } },
            paymentClaims: { orderBy: { claimedAt: 'desc' } },
          },
        },
      },
    });

    if (!token || token.revokedAt || token.expiresAt < new Date()) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invalid or expired invoice link' }, { status: 404 });
    }

    await prisma.invoice_access_tokens.update({
      where: { accessToken },
      data: { lastUsedAt: new Date() },
    });

    const bankAccounts = await prisma.invoice_bank_accounts.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: {
        token: {
          accessToken: token.accessToken,
          expiresAt: token.expiresAt,
        },
        invoice: token.invoice,
        bankAccounts,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to load invoice', error: error.message }, { status: 500 });
  }
}
