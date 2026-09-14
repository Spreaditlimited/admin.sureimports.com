import { prisma } from '@/lib/prisma';
import { createOrGetInvoiceAccessToken } from '@/app/api/invoicing/_lib/invoicing';
import { getCustomerInvoiceBaseUrl } from '@/app/api/invoicing/_lib/customerInvoiceBaseUrl';
import { sendReceiptNotification } from '@/lib/notifications/invoicing';
import { sendAffiliateAccountNotification } from '@/lib/affiliate/emailNotifications';

export async function notifyInvoicePayPalPayment(checkoutId: string) {
  const receipt = await prisma.receipts.findFirst({ where: { pidInvoicePayment: checkoutId }, include: { invoice: true, payment: true } });
  if (!receipt) return;
  const invoice = receipt.invoice;
  if (invoice.customerEmail) {
    const claimed = await prisma.receipts.updateMany({ where: { pidReceipt: receipt.pidReceipt,
      OR: [{ deliveryStatus: 'PENDING' }, { deliveryStatus: 'SENDING', updatedAt: { lt: new Date(Date.now() - 300000) } }] },
      data: { deliveryStatus: 'SENDING' } });
    if (claimed.count) {
      try {
        const token = await createOrGetInvoiceAccessToken({ pidInvoice: invoice.pidInvoice, createdByPidUser: invoice.createdByPidUser });
        await sendReceiptNotification({ toEmail: invoice.customerEmail, customerName: invoice.customerName || 'Customer',
          receiptNumber: receipt.receiptNumber, invoiceNumber: invoice.invoiceNumber, currency: invoice.currency,
          amountReceived: Number(receipt.amount), totalPaid: Number(invoice.amountPaid), balanceAfter: Number(receipt.balanceAfter),
          paymentMethod: 'PAYPAL', paymentReference: receipt.payment.reference, paidAt: receipt.payment.paidAt,
          receiptLink: `${getCustomerInvoiceBaseUrl()}/receipt/${receipt.pidReceipt}?accessToken=${encodeURIComponent(token.accessToken)}` });
        await prisma.receipts.update({ where: { pidReceipt: receipt.pidReceipt }, data: { deliveryStatus: 'SENT', sentAt: new Date() } });
      } catch {
        await prisma.receipts.update({ where: { pidReceipt: receipt.pidReceipt }, data: { deliveryStatus: 'PENDING' } });
      }
    }
  }
  const snapshot = await prisma.invoice_affiliate_commission_snapshots.findUnique({ where: { pidInvoice: invoice.pidInvoice }, include: { conversion: true } });
  if (snapshot?.conversion && snapshot.conversion.status !== 'VOIDED') {
    await sendAffiliateAccountNotification({ affiliateId: snapshot.affiliateId,
      eventKey: `commission:recorded:${snapshot.conversion.pidConversion}`, eventType: 'COMMISSION_RECORDED',
      subject: 'A shipping commission was recorded', title: 'Ship with Us commission recorded',
      message: 'A shipping request you own has been fully paid. Your unit-based commission is now pending review.',
      facts: [{ label: 'Invoice', value: invoice.invoiceNumber }, { label: 'Commission', value: `${snapshot.commissionCurrency} ${snapshot.commissionAmount}` }],
      actionLabel: 'View commission ledger', actionPath: '/dashboard/earnings' });
  }
}
