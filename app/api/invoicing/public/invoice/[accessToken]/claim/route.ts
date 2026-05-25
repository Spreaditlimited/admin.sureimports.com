import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureInvoicingCoreTables, generatePid, toMoneyInput } from '../../../../_lib/invoicing';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accessToken: string }> },
) {
  try {
    await ensureInvoicingCoreTables();
    const { accessToken } = await params;
    const body = await request.json();

    const claimedAmount = Number(body?.claimedAmount || 0);
    if (!Number.isFinite(claimedAmount) || claimedAmount <= 0) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Valid claimed amount is required' }, { status: 400 });
    }

    const token = await prisma.invoice_access_tokens.findUnique({
      where: { accessToken },
      include: { invoice: true },
    });

    if (!token || token.revokedAt || token.expiresAt < new Date()) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invalid or expired invoice link' }, { status: 404 });
    }

    if (token.invoice.status === 'PAID' || token.invoice.status === 'CANCELLED') {
      return NextResponse.json({ statusx: 'ERROR', message: `Invoice is ${token.invoice.status}` }, { status: 400 });
    }

    const selectedBankAccountId = body?.selectedBankAccountId ? String(body.selectedBankAccountId) : null;
    let selectedBankAccountJson: string | null = null;

    if (selectedBankAccountId) {
      const account = await prisma.invoice_bank_accounts.findUnique({ where: { pidBankAccount: selectedBankAccountId } });
      if (account) {
        selectedBankAccountJson = JSON.stringify({
          pidBankAccount: account.pidBankAccount,
          accountName: account.accountName,
          accountNumber: account.accountNumber,
          bankName: account.bankName,
          sortCode: account.sortCode,
          currency: account.currency,
          country: account.country,
        });
      }
    }

    const claim = await prisma.invoice_payment_claims.create({
      data: {
        pidClaim: generatePid('IVC'),
        pidInvoice: token.invoice.pidInvoice,
        pidUser: token.invoice.pidUser,
        claimedAmount: toMoneyInput(claimedAmount),
        currency: token.invoice.currency,
        selectedBankAccountId,
        selectedBankAccountJson,
        paymentReference: body?.paymentReference ? String(body.paymentReference).trim() : null,
        note: body?.note ? String(body.note).trim() : null,
        status: 'PENDING_CONFIRMATION',
      },
    });

    await prisma.invoice_audit_logs.create({
      data: {
        pidAuditLog: generatePid('IAL'),
        pidInvoice: token.invoice.pidInvoice,
        pidUser: token.invoice.pidUser,
        action: 'CUSTOMER_PAYMENT_CLAIM_SUBMITTED',
        oldStatus: token.invoice.status,
        newStatus: token.invoice.status,
        metadata: JSON.stringify({
          pidClaim: claim.pidClaim,
          claimedAmount,
          selectedBankAccountId,
        }),
      },
    });

    return NextResponse.json({ statusx: 'SUCCESS', data: claim }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to submit payment claim', error: error.message }, { status: 500 });
  }
}
