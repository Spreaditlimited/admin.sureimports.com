import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { allocateRefund, validatedRefundStatus } from './paypal-policy';
import { paypalRefundRequest } from './paypal-client';
import { decimalUnits } from './money';

type Leg = {
  id: string;
  refundId: string;
  paymentId: string;
  captureId: string;
  currency: string;
  amount: string;
  status: string;
  providerReference: string | null;
  firstAttemptAt: Date | null;
};

export async function requestOriginalPayPalRefund(
  refundId: string,
  pidUser: string,
) {
  return prisma.$transaction(async (tx) => {
    const [refund] = await tx.$queryRaw<
      {
        amount: string;
        currency: string;
        pidOrder: string;
        refundStatus: string;
      }[]
    >`SELECT amount,currency,pidOrder,refundStatus FROM refund_records WHERE pidRefund=${refundId} AND pidUser=${pidUser} FOR UPDATE`;
    if (!refund || refund.currency !== 'USD')
      throw new Error('Refund not found.');
    const existing = await tx.$queryRaw<
      { method: string }[]
    >`SELECT method FROM refund_settlements WHERE refundId=${refundId}`;
    if (existing.length) {
      if (existing[0].method !== 'PAYPAL')
        throw new Error(
          'This refund already has a different settlement request.',
        );
      return;
    }
    if (refund.refundStatus !== 'pending')
      throw new Error('This refund is not available for a new request.');
    // Stable payment locking serializes reservations made by different refunds on the same order.
    const payments = await tx.$queryRaw<
      {
        pidPayment: string;
        txID: string;
        currency: string;
        amount: string;
        paymentType: string;
      }[]
    >`SELECT pidPayment,txID,currency,amount,paymentType FROM payments WHERE pidUser=${pidUser} AND serviceID=${refund.pidOrder} AND paymentStatus='PAID' ORDER BY id FOR UPDATE`;
    if (!payments.length || payments.some((p) => p.paymentType !== 'PAYPAL'))
      throw new Error(
        'Mixed or unlinked payments require review before refunding.',
      );
    const legacySettlements = await tx.$queryRaw<{pidRefund:string}[]>`SELECT r.pidRefund FROM refund_records r LEFT JOIN refund_settlements s ON s.refundId=r.pidRefund WHERE r.pidOrder=${refund.pidOrder} AND r.pidUser=${pidUser} AND r.pidRefund <> ${refundId} AND r.refundStatus IN ('paid','refunded','wallet-transferred','requested') AND (s.refundId IS NULL OR s.method <> 'PAYPAL') LIMIT 1`;
    if (legacySettlements.length) throw new Error('Earlier bank or wallet refunds must be reconciled before an original-payment refund can be requested.');
    const candidates = [];
    for (const payment of payments) {
      const [reserved] = await tx.$queryRaw<
        { amount: string | null }[]
      >`SELECT SUM(amount) amount FROM refund_provider_legs WHERE captureId=${payment.txID} AND status<>'SUPERSEDED'`;
      candidates.push({
        paymentId: payment.pidPayment,
        captureId: payment.txID,
        currency: payment.currency,
        capturedAmount: String(payment.amount),
        reservedAmount: String(reserved?.amount || '0'),
      });
    }
    const allocations = allocateRefund(
      refund.amount,
      refund.currency,
      candidates,
    );
    await tx.$executeRaw`INSERT INTO refund_settlements (refundId,pidUser,sourceCurrency,sourceAmount,settlementCurrency,settlementAmount,exchangeRate,method,destinationCiphertext) VALUES (${refundId},${pidUser},${refund.currency},${refund.amount},${refund.currency},${refund.amount},1,'PAYPAL','')`;
    for (const allocation of allocations) {
      const id = `RFP${randomUUID().replaceAll('-', '')}`;
      await tx.$executeRaw`INSERT INTO refund_provider_legs (id,refundId,paymentId,captureId,currency,amount) VALUES (${id},${refundId},${allocation.paymentId},${allocation.captureId},${allocation.currency},${allocation.amount})`;
    }
    await tx.refund_records.update({
      where: { pidRefund: refundId },
      data: { refundStatus: 'requested', updatedAt: new Date() },
    });
  });
}

export async function reconcileRefundLeg(leg: Leg, allowInitiation = false) {
  if (leg.status === 'SETTLED' || leg.status === 'SUPERSEDED') return;
  await prisma.$executeRaw`UPDATE refund_provider_legs SET checkedAt=NOW(3) WHERE id=${leg.id}`;
  if (!leg.providerReference && leg.firstAttemptAt) {
    const payment = await prisma.payments.findUnique({ where: { pidPayment: leg.paymentId } });
    if (!payment) throw new Error('Original payment linkage is missing.');
    const order = await paypalRefundRequest(`/orders/${payment.txRef}`);
    const matches = (order.purchase_units || []).flatMap((unit: any) => unit.payments?.refunds || []).filter((refund: any) => refund.invoice_id === leg.id);
    if (matches.length === 1 && /^[A-Za-z0-9]+$/.test(String(matches[0].id))) {
      return reconcileRefundLeg({ ...leg, providerReference: String(matches[0].id) }, false);
    }
    // No matching provider record is not proof of failure. Never reissue the charge.
    return;
  }
  let provider;
  if (leg.providerReference)
    provider = await paypalRefundRequest(`/refunds/${leg.providerReference}`);
  else {
    // Only an explicit admin approval may start a refund. A timed-out first call is never resent automatically.
    if (!allowInitiation || leg.firstAttemptAt || leg.status !== 'REQUESTED')
      return;
    const externalReviews = await prisma.$queryRaw<{ id: string }[]>`
      SELECT e.id FROM refund_events e WHERE e.eventType='EXTERNAL_PAYPAL_REFUND'
        AND JSON_UNQUOTE(JSON_EXTRACT(e.detailsJson,'$.captureId'))=${leg.captureId}
        AND NOT EXISTS (SELECT 1 FROM refund_events resolved WHERE resolved.id=CONCAT('RESOLVED:',e.id))
      LIMIT 1`;
    if (externalReviews.length) throw new Error('An earlier PayPal refund needs review before another refund can be sent.');
    const capture = await paypalRefundRequest(`/captures/${leg.captureId}`);
    const payment = await prisma.payments.findUnique({
      where: { pidPayment: leg.paymentId },
    });
    if (
      !payment ||
      capture.id !== leg.captureId ||
      capture.amount?.currency_code !== leg.currency ||
      decimalUnits(String(capture.amount?.value || ''), 2) !==
        decimalUnits(String(payment.amount), 2) ||
      !['COMPLETED', 'PARTIALLY_REFUNDED'].includes(capture.status)
    )
      throw new Error('The original payment could not be verified.');
    // Out-of-band refunds must be reviewed before another automatic refund can be sent.
    if (capture.status === 'PARTIALLY_REFUNDED') {
      const order = await paypalRefundRequest(`/orders/${payment.txRef}`);
      const unit = order.purchase_units?.find((u: any) =>
        u.payments?.captures?.some((c: any) => c.id === leg.captureId),
      );
      if (!unit || unit.payments.captures.length !== 1)
        throw new Error('Refund capture history requires review.');
      const prior = await prisma.$queryRaw<
        { providerReference: string; amount: string; currency: string }[]
      >`SELECT providerReference,amount,currency FROM refund_provider_legs WHERE captureId=${leg.captureId} AND status='SETTLED'`;
      const returned = (unit.payments.refunds || []).filter((refund: any) => !['FAILED', 'CANCELLED'].includes(refund.status));
      if (
        !returned.length ||
        returned.length !== prior.length ||
        returned.some(
          (r: any) =>
            !prior.some(
              (p) =>
                p.providerReference === r.id &&
                p.currency === r.amount?.currency_code &&
                decimalUnits(String(p.amount), 2) ===
                  decimalUnits(String(r.amount?.value || ''), 2),
            ),
        )
      )
        throw new Error(
          'An earlier provider refund needs reconciliation before another refund can be sent.',
        );
    }
    const claimed =
      await prisma.$executeRaw`UPDATE refund_provider_legs SET status='PROCESSING',firstAttemptAt=NOW(3),checkedAt=NOW(3) WHERE id=${leg.id} AND status='REQUESTED' AND firstAttemptAt IS NULL`;
    if (!claimed) return;
    provider = await paypalRefundRequest(
      `/captures/${leg.captureId}/refund`,
      {
        amount: {
          currency_code: leg.currency,
          value: Number(leg.amount).toFixed(2),
        },
        invoice_id: leg.id,
      },
      leg.id,
    );
    // Persist the provider identity even if a minimal response omits money fields.
    // Recovery can then GET the canonical refund without sending another POST.
    if (/^[A-Za-z0-9]+$/.test(String(provider.id || ''))) {
      await prisma.$executeRaw`UPDATE refund_provider_legs SET providerReference=${String(provider.id)},updatedAt=NOW(3) WHERE id=${leg.id} AND providerReference IS NULL`;
      if (!provider.amount || !provider.invoice_id) provider = await paypalRefundRequest(`/refunds/${provider.id}`);
    }
  }
  const status = validatedRefundStatus(provider, {
    captureId: leg.captureId,
    currency: leg.currency,
    amount: String(leg.amount),
    requestId: leg.id,
  });
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT refundId FROM refund_settlements WHERE refundId=${leg.refundId} FOR UPDATE`;
    await tx.$executeRaw`UPDATE refund_provider_legs SET providerReference=${String(provider.id)},status=${status},checkedAt=NOW(3),updatedAt=NOW(3) WHERE id=${leg.id} AND status NOT IN ('SETTLED','SUPERSEDED')`;
    const pending = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM refund_provider_legs WHERE refundId=${leg.refundId} AND status NOT IN ('SETTLED','SUPERSEDED')`;
    if (!pending.length) {
      await tx.$executeRaw`UPDATE refund_settlements SET status='SETTLED',settledAt=NOW(3),updatedAt=NOW(3) WHERE refundId=${leg.refundId} AND method='PAYPAL'`;
      await tx.refund_records.update({
        where: { pidRefund: leg.refundId },
        data: {
          refundStatus: 'refunded',
          xStatus: 'REFUNDED',
          updatedAt: new Date(),
        },
      });
    }
  });
}

export async function processOriginalPayPalRefund(
  refundId: string,
  adminId: string,
) {
  const claimed =
    await prisma.$executeRaw`UPDATE refund_settlements SET approvedBy=${adminId},status='PROCESSING',updatedAt=NOW(3) WHERE refundId=${refundId} AND method='PAYPAL' AND status IN ('REQUESTED','PROCESSING')`;
  if (!claimed)
    throw new Error('This refund is not awaiting PayPal processing.');
  const legs = await prisma.$queryRaw<
    Leg[]
  >`SELECT * FROM refund_provider_legs WHERE refundId=${refundId} ORDER BY id`;
  for (const leg of legs) await reconcileRefundLeg(leg, true);
}

export async function reconcileOriginalPayPalRefunds() {
  const legs = await prisma.$queryRaw<
    Leg[]
  >`SELECT * FROM refund_provider_legs WHERE status='PROCESSING' ORDER BY checkedAt LIMIT 4`;
  const results = await Promise.allSettled(
    legs.map((leg) => reconcileRefundLeg(leg)),
  );
  return {
    checked: legs.length,
    errors: results.filter((result) => result.status === 'rejected').length,
  };
}

/** Read-only provider recovery: this path must never initiate another refund. */
export async function checkOriginalPayPalRefund(
  refundId: string,
  actor: string,
  recovery?: { legId: string; providerReference: string },
) {
  const [settlement] = await prisma.$queryRaw<{ method: string }[]>`
    SELECT method FROM refund_settlements WHERE refundId=${refundId}`;
  if (settlement?.method !== 'PAYPAL') throw new Error('PayPal refund request not found.');
  const legs = await prisma.$queryRaw<Leg[]>`
    SELECT * FROM refund_provider_legs WHERE refundId=${refundId} ORDER BY id`;
  if (!legs.length) throw new Error('This refund has no payment allocations. Review the request before proceeding.');
  if (recovery) {
    const leg = legs.find(item => item.id === recovery.legId);
    if (!leg || !leg.firstAttemptAt || leg.status === 'SETTLED' ||
      !/^[A-Za-z0-9]{5,80}$/.test(recovery.providerReference) ||
      (leg.providerReference && leg.providerReference !== recovery.providerReference)) {
      throw new Error('Select an attempted refund and its matching PayPal refund reference.');
    }
    // The canonical response must match amount, currency, invoice ID and capture.
    await reconcileRefundLeg({ ...leg, providerReference: recovery.providerReference }, false);
  } else {
    for (const leg of legs) await reconcileRefundLeg(leg, false);
  }
  await prisma.$executeRaw`INSERT INTO refund_events (id,refundId,eventType,actorPid,detailsJson)
    VALUES (${randomUUID()},${refundId},'PAYPAL_STATUS_CHECKED',${actor},${JSON.stringify({ recoveredLeg: recovery?.legId || null })})`;
  const [current] = await prisma.$queryRaw<{ status: string }[]>`
    SELECT status FROM refund_settlements WHERE refundId=${refundId}`;
  return { status: current?.status || 'PROCESSING' };
}

export async function handleOriginalPayPalRefundEvent(resource: any) {
  const requestId = String(resource?.invoice_id || '');
  const reference = String(resource?.id || '');
  if (!/^[A-Za-z0-9]+$/.test(reference)) return false;
  const [leg] = await prisma.$queryRaw<
    Leg[]
  >`SELECT * FROM refund_provider_legs WHERE id=${requestId} OR providerReference=${reference} LIMIT 1`;
  if (!leg) return false;
  await reconcileRefundLeg({ ...leg, providerReference: reference });
  return true;
}
