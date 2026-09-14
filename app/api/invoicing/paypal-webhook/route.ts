import { recordExternalPayPalRefund } from '@/lib/refunds/external-paypal';
import { paypalCaptureReference } from '@/lib/refunds/paypal-reference';
import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invoicePayPalEnvironment, invoicePayPalRequest } from '@/lib/invoicing/paypalClient';
import { confirmInvoicePayPalCheckout } from '@/lib/invoicing/paypalCheckout';
import { notifyInvoicePayPalPayment } from '@/lib/invoicing/paypalNotifications';
import { reverseAffiliateConversions } from '@/lib/affiliate/reversals';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const environment = invoicePayPalEnvironment();
  const webhookId = environment === 'live' ? process.env.SUREIMPORTS_PAYPAL_WEBHOOK_ID : process.env.SUREIMPORTS_PAYPAL_SANDBOX_WEBHOOK_ID;
  if (!body || !webhookId) return Response.json({ message: 'Webhook is not configured.' }, { status: 503 });
  try {
    const signature = await invoicePayPalRequest('/v1/notifications/verify-webhook-signature', {
      webhook_id: webhookId, webhook_event: body,
      transmission_id: request.headers.get('paypal-transmission-id'), transmission_time: request.headers.get('paypal-transmission-time'),
      transmission_sig: request.headers.get('paypal-transmission-sig'), cert_url: request.headers.get('paypal-cert-url'), auth_algo: request.headers.get('paypal-auth-algo'),
    });
    if (signature?.verification_status !== 'SUCCESS') return Response.json({ message: 'Invalid signature.' }, { status: 401 });
    const event = String(body.event_type || '');
    const resource = body.resource || {};
    const orderId = String(resource.supplementary_data?.related_ids?.order_id || (event === 'CHECKOUT.ORDER.APPROVED' ? resource.id : '') || '');
    const captureId = paypalCaptureReference(event,resource);
    const rows = await prisma.$queryRaw<{ id: string; pidInvoice: string }[]>`SELECT id, pidInvoice FROM paypal_invoice_checkouts
      WHERE environment = ${environment} AND (providerReference = ${orderId} OR captureReference = ${captureId}) LIMIT 1`;
    if (!rows[0]) return Response.json({ received: true, matched: false });
    const checkout = rows[0];
    if (event === 'CHECKOUT.ORDER.APPROVED' || event === 'PAYMENT.CAPTURE.COMPLETED') {
      const result = await confirmInvoicePayPalCheckout(checkout.id);
      if (result.status === 'PAID') after(() => notifyInvoicePayPalPayment(checkout.id));
    } else if (['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED'].includes(event) || event === 'CUSTOMER.DISPUTE.CREATED') {
      // Preserve the original invoice/receipt for audit. Refund allocation and
      // dispute outcomes need review rather than silently rewriting history.
      if (environment !== 'live') return Response.json({ received: true });
      if (event === 'PAYMENT.CAPTURE.REFUNDED') {
        await recordExternalPayPalRefund(String(resource.id||''),captureId,`shipping-invoice:${checkout.pidInvoice}`);
        return Response.json({received:true,reviewRequired:true});
      }
      await reverseAffiliateConversions({ externalOrderReference: `shipping-invoice:${checkout.pidInvoice}`, reason: `PayPal reported ${event}.`, reversalReference: String(body.id) });
      await prisma.$transaction(async (tx) => {
        const changed = await tx.$executeRaw`UPDATE paypal_invoice_checkouts SET status = 'REVIEW', updatedAt = NOW(3) WHERE id = ${checkout.id} AND status <> 'REVIEW'`;
        await tx.payments.updateMany({ where: { pidPayment: checkout.id }, data: { paymentStatus: event === 'CUSTOMER.DISPUTE.CREATED' ? 'DISPUTED' : 'REVERSED' } });
        if (changed) await tx.invoice_audit_logs.create({ data: { pidAuditLog: `IAL_PP_${body.id}`, pidInvoice: checkout.pidInvoice,
          action: 'PAYPAL_PAYMENT_REVIEW_REQUIRED', metadata: JSON.stringify({ event, eventId: body.id, checkoutId: checkout.id }) } });
      });
    }
    return Response.json({ received: true, matched: true });
  } catch { return Response.json({ message: 'Invoice payment processing will be retried.' }, { status: 503 }); }
}
