import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createUniqueReceiptNumber,
  derivePaymentStatus,
  ensureInvoicingCoreTables,
  generatePid,
  requireAdmin,
  toMoneyInput,
  unauthorized,
} from '../../../_lib/invoicing';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ pidClaim: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();
    await ensureInvoicingCoreTables();

    const { pidClaim } = await params;

    const claim = await prisma.invoice_payment_claims.findUnique({
      where: { pidClaim },
      include: { invoice: true },
    });

    if (!claim) return NextResponse.json({ statusx: 'ERROR', message: 'Claim not found' }, { status: 404 });
    if (claim.status !== 'PENDING_CONFIRMATION') {
      return NextResponse.json({ statusx: 'ERROR', message: `Claim is already ${claim.status}` }, { status: 400 });
    }

    const amountNum = Number(claim.claimedAmount);
    const grandTotal = Number(claim.invoice.grandTotal);
    const currentPaid = Number(claim.invoice.amountPaid);
    const newPaid = currentPaid + amountNum;

    if (newPaid - grandTotal > 0.0001) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Claimed amount exceeds outstanding balance' }, { status: 400 });
    }

    const newBalance = Math.max(grandTotal - newPaid, 0);
    const newStatus = derivePaymentStatus(newPaid, grandTotal);
    const pidInvoicePayment = generatePid('IVP');
    const receiptNumber = await createUniqueReceiptNumber();

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.invoice_payments.create({
        data: {
          pidInvoicePayment,
          pidInvoice: claim.pidInvoice,
          pidUser: claim.invoice.pidUser,
          amount: toMoneyInput(amountNum),
          currency: claim.currency,
          paymentMethod: 'CUSTOMER_CLAIM',
          reference: claim.paymentReference || null,
          note: claim.note || null,
          paidAt: claim.claimedAt,
          recordedByPidUser: admin.pidUser,
        },
      });

      const updatedInvoice = await tx.invoices.update({
        where: { pidInvoice: claim.pidInvoice },
        data: {
          amountPaid: toMoneyInput(newPaid),
          balanceDue: toMoneyInput(newBalance),
          status: newStatus,
          paidAt: newStatus === 'PAID' ? new Date() : null,
          updatedByPidUser: admin.pidUser,
        },
      });

      const receipt = await tx.receipts.create({
        data: {
          pidReceipt: generatePid('RCT'),
          receiptNumber,
          pidInvoice: claim.pidInvoice,
          pidInvoicePayment,
          amount: toMoneyInput(amountNum),
          balanceAfter: toMoneyInput(newBalance),
          issuedAt: new Date(),
          deliveryStatus: 'PENDING',
          createdByPidUser: admin.pidUser,
        },
      });

      const updatedClaim = await tx.invoice_payment_claims.update({
        where: { pidClaim },
        data: {
          status: 'APPROVED',
          reviewedByPidUser: admin.pidUser,
          reviewedAt: new Date(),
          approvedInvoicePaymentPid: pidInvoicePayment,
        },
      });

      await tx.invoice_audit_logs.create({
        data: {
          pidAuditLog: generatePid('IAL'),
          pidInvoice: claim.pidInvoice,
          pidUser: admin.pidUser,
          action: 'CUSTOMER_PAYMENT_CLAIM_APPROVED',
          oldStatus: claim.invoice.status,
          newStatus,
          metadata: JSON.stringify({ pidClaim, pidInvoicePayment, amount: amountNum, receiptNumber }),
        },
      });

      return { payment, updatedInvoice, receipt, updatedClaim };
    });

    return NextResponse.json({ statusx: 'SUCCESS', data: result });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to approve claim', error: error.message }, { status: 500 });
  }
}
