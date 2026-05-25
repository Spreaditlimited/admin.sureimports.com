import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createUniqueReceiptNumber,
  derivePaymentStatus,
  generatePid,
  requireAdmin,
  toMoneyInput,
  unauthorized,
} from '../../../_lib/invoicing';
import { sendReceiptNotification } from '@/lib/notifications/invoicing';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pidInvoice: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { pidInvoice } = await params;
    const body = await request.json();
    const { amount, paymentMethod, reference, note, paidAt } = body;

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Valid payment amount is required' }, { status: 400 });
    }
    if (!paymentMethod) {
      return NextResponse.json({ statusx: 'ERROR', message: 'paymentMethod is required' }, { status: 400 });
    }

    const invoice = await prisma.invoices.findUnique({ where: { pidInvoice } });
    if (!invoice) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') {
      return NextResponse.json(
        { statusx: 'ERROR', message: `Cannot record payment for invoice in ${invoice.status} status` },
        { status: 400 },
      );
    }

    const amountNum = Number(amount);
    const grandTotal = Number(invoice.grandTotal);
    const currentPaid = Number(invoice.amountPaid);
    const newPaid = currentPaid + amountNum;

    if (newPaid - grandTotal > 0.0001) {
      return NextResponse.json(
        { statusx: 'ERROR', message: 'Payment exceeds outstanding balance' },
        { status: 400 },
      );
    }

    const newBalance = Math.max(grandTotal - newPaid, 0);
    const newStatus = derivePaymentStatus(newPaid, grandTotal);

    const pidInvoicePayment = generatePid('IVP');
    const receiptNumber = await createUniqueReceiptNumber();

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.invoice_payments.create({
        data: {
          pidInvoicePayment,
          pidInvoice,
          pidUser: invoice.pidUser,
          amount: toMoneyInput(amountNum),
          currency: invoice.currency,
          paymentMethod,
          reference: reference || null,
          note: note || null,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
          recordedByPidUser: admin.pidUser,
        },
      });

      const updatedInvoice = await tx.invoices.update({
        where: { pidInvoice },
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
          pidInvoice,
          pidInvoicePayment,
          amount: toMoneyInput(amountNum),
          balanceAfter: toMoneyInput(newBalance),
          issuedAt: new Date(),
          deliveryStatus: 'PENDING',
          createdByPidUser: admin.pidUser,
        },
      });

      await tx.invoice_audit_logs.create({
        data: {
          pidAuditLog: generatePid('IAL'),
          pidInvoice,
          pidUser: admin.pidUser,
          action: 'PAYMENT_RECORDED',
          oldStatus: invoice.status,
          newStatus,
          metadata: JSON.stringify({
            amount: amountNum,
            paymentMethod,
            reference: reference || null,
            pidInvoicePayment,
            receiptNumber,
          }),
        },
      });

      return { payment, updatedInvoice, receipt };
    });

    const customerEmail = invoice.customerEmail;
    if (customerEmail) {
      const sent = await sendReceiptNotification({
        toEmail: customerEmail,
        customerName: invoice.customerName || 'Customer',
        receiptNumber: result.receipt.receiptNumber,
        invoiceNumber: invoice.invoiceNumber,
        currency: invoice.currency,
        amountReceived: amountNum,
        totalPaid: newPaid,
        balanceAfter: newBalance,
        paymentMethod,
        paymentReference: reference || null,
        paidAt: result.payment.paidAt,
      })
        .then(() => true)
        .catch(() => false);

      if (sent) {
        await prisma.receipts.update({
          where: { pidReceipt: result.receipt.pidReceipt },
          data: { deliveryStatus: 'SENT', sentAt: new Date() },
        });
      }
    }

    return NextResponse.json({ statusx: 'SUCCESS', data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to record payment', error: error.message },
      { status: 500 },
    );
  }
}
