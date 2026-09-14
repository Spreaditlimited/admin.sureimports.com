import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { invoicePayPalEnvironment, invoicePayPalRequest } from './paypalClient';
import { assertInvoicePayPalOrder, invoiceMatchesPayPalQuote, invoicePayPalAmountMinor } from './paypalPolicy';
import { createUniqueReceiptNumber, derivePaymentStatus } from '@/app/api/invoicing/_lib/invoicing';
import { parseInvoiceLinkedRequestId } from '@/lib/invoiceLinkedService';
import { recordPaidShippingCommission } from '@/lib/affiliate/shippingCommissions';

type Checkout = {
  id: string; pidInvoice: string; environment: string; currency: string;
  amountMinor: number; invoiceUpdatedAt: Date; providerReference: string | null;
  status: string; createdAt: Date;
};

async function readCheckout(id: string): Promise<Checkout> {
  const rows = await prisma.$queryRaw<Checkout[]>`SELECT * FROM paypal_invoice_checkouts WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) throw new Error('Invoice checkout not found.');
  return { ...rows[0], amountMinor: Number(rows[0].amountMinor) };
}

export async function invoiceFromAccessToken(accessToken: string) {
  const token = await prisma.invoice_access_tokens.findUnique({ where: { accessToken }, include: { invoice: true } });
  if (!token || token.revokedAt || token.expiresAt <= new Date()) throw new Error('This invoice link is invalid or expired. Please request a new link.');
  return token.invoice;
}

export async function startInvoicePayPalCheckout(accessToken: string) {
  const invoice = await invoiceFromAccessToken(accessToken);
  if (['DRAFT', 'CANCELLED', 'PAID'].includes(invoice.status)) throw new Error('This invoice is not awaiting payment.');
  // These are the currencies currently supported by the card checkout. Never
  // silently convert an invoice or route an NGN invoice away from Paystack.
  if (!['USD', 'GBP', 'EUR'].includes(invoice.currency)) throw new Error('Card checkout is not available for this invoice currency.');
  const claims = await prisma.invoice_payment_claims.count({ where: { pidInvoice: invoice.pidInvoice, status: 'PENDING_CONFIRMATION' } });
  if (claims) throw new Error('Your bank payment is awaiting confirmation. Do not pay again.');
  const environment = invoicePayPalEnvironment();
  const amountMinor = invoicePayPalAmountMinor(invoice.balanceDue);
  const stageKey = createHash('sha256').update(JSON.stringify([environment, invoice.pidInvoice, invoice.updatedAt.toISOString(), amountMinor, invoice.currency])).digest('hex');
  const candidate = `PINV_${randomUUID().replaceAll('-', '')}`;
  await prisma.$executeRaw`INSERT IGNORE INTO paypal_invoice_checkouts (id, stageKey, pidInvoice, environment, currency, amountMinor, invoiceUpdatedAt)
    VALUES (${candidate}, ${stageKey}, ${invoice.pidInvoice}, ${environment}, ${invoice.currency}, ${amountMinor}, ${invoice.updatedAt})`;
  const stages = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM paypal_invoice_checkouts WHERE stageKey = ${stageKey}`;
  const checkout = await readCheckout(stages[0].id);
  if (checkout.status !== 'PENDING') throw new Error('This payment has already been processed. Refresh the invoice before paying again.');
  if (!checkout.providerReference) {
    // Do not retry ambiguous creation beyond PayPal's minimum idempotency
    // retention window. Reconciliation/admin review must resolve it first.
    if (Date.now() - checkout.createdAt.getTime() > 5 * 60 * 60 * 1000) throw new Error('This checkout needs a payment-status check. Contact support before retrying.');
    const result = await invoicePayPalRequest('/v2/checkout/orders', {
      intent: 'CAPTURE', purchase_units: [{ custom_id: checkout.id, invoice_id: checkout.id,
        description: `Sure Imports invoice ${invoice.invoiceNumber}`,
        amount: { currency_code: invoice.currency, value: (amountMinor / 100).toFixed(2) } }],
    }, checkout.id);
    if (!result?.id) throw new Error('PayPal did not return a checkout reference.');
    await prisma.$executeRaw`UPDATE paypal_invoice_checkouts SET providerReference = ${String(result.id)}, updatedAt = NOW(3) WHERE id = ${checkout.id} AND providerReference IS NULL`;
  }
  const saved = await readCheckout(checkout.id);
  return { checkoutId: saved.id, orderId: saved.providerReference, amount: (amountMinor / 100).toFixed(2), currency: saved.currency, environment, description: `Sure Imports invoice ${invoice.invoiceNumber}` };
}

export async function confirmInvoicePayPalCheckout(checkoutId: string, accessToken?: string) {
  const checkout = await readCheckout(checkoutId);
  if (accessToken) {
    const invoice = await invoiceFromAccessToken(accessToken);
    if (invoice.pidInvoice !== checkout.pidInvoice) throw new Error('This payment belongs to a different invoice.');
  }
  if (checkout.environment !== invoicePayPalEnvironment()) throw new Error('Payment environment mismatch.');
  if (checkout.status === 'PAID' || checkout.status === 'REVIEW') return { status: checkout.status, checkoutId };
  if (checkout.status !== 'PENDING' || !checkout.providerReference) throw new Error('This payment cannot be confirmed automatically.');
  await prisma.$executeRaw`UPDATE paypal_invoice_checkouts SET lastCheckedAt = NOW(3) WHERE id = ${checkout.id}`;
  const path = `/v2/checkout/orders/${encodeURIComponent(checkout.providerReference)}`;
  let order = await invoicePayPalRequest(path);
  const expected = { ...checkout, providerReference: checkout.providerReference };
  assertInvoicePayPalOrder(order, expected);
  if (order.status === 'APPROVED') {
    const invoice = await prisma.invoices.findUniqueOrThrow({ where: { pidInvoice: checkout.pidInvoice } });
    const claims = await prisma.invoice_payment_claims.count({ where: { pidInvoice: invoice.pidInvoice, status: 'PENDING_CONFIRMATION' } });
    if (claims || !invoiceMatchesPayPalQuote(invoice, checkout)) throw new Error('The invoice changed during checkout. Refresh it before paying. No capture was attempted.');
    try { order = await invoicePayPalRequest(`${path}/capture`, {}, `capture-${checkout.providerReference}`); }
    catch (error) {
      // A timeout does not mean no money moved. Read authoritative state before retrying.
      order = await invoicePayPalRequest(path);
      if (order.status !== 'COMPLETED') throw error;
    }
  }
  const captureReference = assertInvoicePayPalOrder(order, expected, true)!;
  if (checkout.environment !== 'live') return { status: 'SANDBOX_CONFIRMED', checkoutId };
  const receiptNumber = await createUniqueReceiptNumber();
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM paypal_invoice_checkouts WHERE id = ${checkout.id} FOR UPDATE`;
    const state = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM paypal_invoice_checkouts WHERE id = ${checkout.id}`;
    if (state[0].status !== 'PENDING') return { status: state[0].status, checkoutId };
    await tx.$queryRaw`SELECT id FROM invoices WHERE pidInvoice = ${checkout.pidInvoice} FOR UPDATE`;
    const invoice = await tx.invoices.findUniqueOrThrow({ where: { pidInvoice: checkout.pidInvoice } });
    const matches = invoiceMatchesPayPalQuote(invoice, checkout);
    const amount = checkout.amountMinor / 100;
    const now = new Date();
    // Always record captured money, even if a concurrent edit requires review.
    await tx.payments.create({ data: {
      pidPayment: checkout.id, pidUser: invoice.pidUser, payerName: invoice.customerName || 'Invoice Customer',
      payerEmail: invoice.customerEmail, txID: captureReference, txRef: expected.providerReference,
      paymentStatus: 'PAID', paymentType: 'PAYPAL', currency: checkout.currency, amount,
      serviceID: invoice.pidInvoice, serviceName: 'Invoice Payment',
      serviceDescription: `Invoice ${invoice.invoiceNumber}${matches ? '' : ' — allocation requires review'}`,
      txDateProcesser: now.toISOString(), txDateServer: now.toISOString(), xStatus: 'active',
    } });
    if (matches) {
      const paid = (Math.round(Number(invoice.amountPaid) * 100) + checkout.amountMinor) / 100;
      const balance = Math.max(0, (Math.round(Number(invoice.grandTotal) * 100) - Math.round(paid * 100)) / 100);
      const status = derivePaymentStatus(paid, Number(invoice.grandTotal));
      await tx.invoice_payments.create({ data: { pidInvoicePayment: checkout.id, pidInvoice: invoice.pidInvoice,
        pidUser: invoice.pidUser, currency: checkout.currency, amount, paymentMethod: 'PAYPAL', reference: captureReference, paidAt: now } });
      await tx.invoices.update({ where: { pidInvoice: invoice.pidInvoice }, data: { amountPaid: paid, balanceDue: balance, status, paidAt: status === 'PAID' ? now : null } });
      await tx.receipts.create({ data: { pidReceipt: `RCT_${randomUUID()}`, receiptNumber, pidInvoice: invoice.pidInvoice,
        pidInvoicePayment: checkout.id, amount, balanceAfter: balance, issuedAt: now, deliveryStatus: 'PENDING' } });
      if (status === 'PAID') {
        const linked = parseInvoiceLinkedRequestId(invoice.linkedRequestId);
        if (linked.type === 'shipping-only') await tx.shipping_only.updateMany({ where: { pidShippingOnly: linked.id }, data: { status: 'paid', updatedAt: now } });
        if (linked.type === 'corporate-gift') await tx.corporate_gift_request.updateMany({ where: { pidRequest: linked.id }, data: { status: 'Paid' } });
        await recordPaidShippingCommission(tx, { pidInvoice: invoice.pidInvoice, grossAmount: invoice.grandTotal });
      }
    }
    const status = matches ? 'PAID' : 'REVIEW';
    await tx.$executeRaw`UPDATE paypal_invoice_checkouts SET status = ${status}, captureReference = ${captureReference}, updatedAt = NOW(3) WHERE id = ${checkout.id}`;
    await tx.invoice_audit_logs.create({ data: { pidAuditLog: `IAL_${randomUUID()}`, pidInvoice: invoice.pidInvoice,
      action: matches ? 'PAYPAL_PAYMENT_RECORDED' : 'PAYPAL_PAYMENT_ALLOCATION_REVIEW',
      metadata: JSON.stringify({ checkoutId, captureReference, amount, currency: checkout.currency }) } });
    return { status, checkoutId };
  }, { timeout: 20000 });
}
