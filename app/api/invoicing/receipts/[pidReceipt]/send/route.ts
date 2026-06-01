import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrGetInvoiceAccessToken, requireAdmin, unauthorized, writeAuditLog } from '../../../_lib/invoicing';
import { getCustomerInvoiceBaseUrl } from '../../../_lib/customerInvoiceBaseUrl';
import { sendReceiptNotification } from '@/lib/notifications/invoicing';
import { appendBusinessName, getUserBusinessName } from '@/lib/userBusinessName';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ pidReceipt: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { pidReceipt } = await params;

    const receipt = await prisma.receipts.findUnique({
      where: { pidReceipt },
      include: {
        invoice: true,
        payment: true,
      },
    });

    if (!receipt) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Receipt not found' }, { status: 404 });
    }

    if (!receipt.invoice.customerEmail) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Customer email not found on invoice' }, { status: 400 });
    }

    const token = await createOrGetInvoiceAccessToken({
      pidInvoice: receipt.pidInvoice,
      createdByPidUser: admin.pidUser,
    });
    const customerBaseUrl = getCustomerInvoiceBaseUrl();
    const receiptLink = `${customerBaseUrl}/receipt/${receipt.pidReceipt}?accessToken=${encodeURIComponent(token.accessToken)}`;
    const businessName = await getUserBusinessName(receipt.invoice.pidUser);
    const customerName = appendBusinessName(
      receipt.invoice.customerName || 'Customer',
      businessName,
    ) || receipt.invoice.customerName || 'Customer';

    await sendReceiptNotification({
      toEmail: receipt.invoice.customerEmail,
      customerName,
      receiptNumber: receipt.receiptNumber,
      invoiceNumber: receipt.invoice.invoiceNumber,
      currency: receipt.invoice.currency,
      amountReceived: Number(receipt.amount || 0),
      totalPaid: Number(receipt.invoice.amountPaid || 0),
      balanceAfter: Number(receipt.balanceAfter || 0),
      paymentMethod: receipt.payment.paymentMethod,
      paymentReference: receipt.payment.reference || null,
      paidAt: receipt.payment.paidAt,
      receiptLink,
    });

    const updated = await prisma.receipts.update({
      where: { pidReceipt },
      data: {
        deliveryStatus: 'SENT',
        sentAt: new Date(),
      },
    });

    await writeAuditLog({
      pidInvoice: receipt.pidInvoice,
      pidUser: admin.pidUser,
      action: 'RECEIPT_SENT',
      metadata: JSON.stringify({ pidReceipt, receiptNumber: receipt.receiptNumber }),
    });

    return NextResponse.json({ statusx: 'SUCCESS', data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to send receipt', error: error.message },
      { status: 500 },
    );
  }
}
