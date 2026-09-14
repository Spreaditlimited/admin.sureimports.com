import 'server-only';
import type { Prisma } from '@prisma/client';

/** Check the source refunds, not the size of the last reconciliation batch. */
export async function assertRefundsReconciled(
  tx: Prisma.TransactionClient,
  affiliateId: number,
  currency: string,
) {
  const unpaidRecovery = await tx.$queryRaw<{ id: number }[]>`
    SELECT c.id FROM affiliate_conversions c WHERE c.affiliateId=${affiliateId}
      AND c.commissionCurrency=${currency} AND c.status='VOIDED'
      AND EXISTS (SELECT 1 FROM affiliate_payout_items i JOIN affiliate_payouts p ON p.id=i.payoutId WHERE i.conversionId=c.id AND p.status='PAID')
      AND NOT EXISTS (SELECT 1 FROM affiliate_refund_adjustments a WHERE a.conversionId=c.id AND a.refundId=CONCAT('FULL_REVERSAL:',c.id))
    LIMIT 1 FOR UPDATE`;
  if (unpaidRecovery.length) throw new Error('A customer refund is being reviewed against your earnings. Please try again once the review is complete, or contact support.');
  const unresolved = await tx.$queryRaw<{ pidRefund: string }[]>`
    SELECT r.pidRefund FROM refund_records r
    JOIN affiliate_conversions c ON c.externalOrderReference=CONCAT(IF(r.serviceType='SHIPPING_INVOICE','shipping-invoice:','procurement:'),r.pidOrder)
    WHERE c.affiliateId=${affiliateId} AND c.commissionCurrency=${currency}
      AND c.status IN ('PENDING','AVAILABLE','RESERVED','PAID')
      AND r.ext1='ORDER_ADJUSTMENT' AND r.serviceType IN ('PROCUREMENT','SHIPPING_INVOICE')
      AND CAST(r.amount AS DECIMAL(18,2)) > 0
      AND NOT EXISTS (SELECT 1 FROM refund_events e WHERE e.id=CONCAT('COMMISSION:',r.pidRefund))
    LIMIT 1 FOR UPDATE`;
  if (unresolved.length) {
    throw new Error('A customer refund is being reviewed against your earnings. Please try again once the review is complete, or contact support.');
  }
  const external = await tx.$queryRaw<{ id: string }[]>`
    SELECT e.id FROM refund_events e
    JOIN affiliate_conversions c ON (
      c.externalPaymentReference=CONCAT('paypal:',JSON_UNQUOTE(JSON_EXTRACT(e.detailsJson,'$.captureId')))
      OR c.externalPaymentReference=CONCAT('paypal:',JSON_UNQUOTE(JSON_EXTRACT(e.detailsJson,'$.orderId')))
      OR c.externalOrderReference=JSON_UNQUOTE(JSON_EXTRACT(e.detailsJson,'$.externalOrderReference'))
    )
    WHERE e.eventType='EXTERNAL_PAYPAL_REFUND'
      AND c.affiliateId=${affiliateId} AND c.commissionCurrency=${currency}
      AND c.status IN ('PENDING','AVAILABLE','RESERVED','PAID')
      AND NOT EXISTS (SELECT 1 FROM refund_events resolved WHERE resolved.id=CONCAT('RESOLVED:',e.id))
    LIMIT 1 FOR UPDATE`;
  if (external.length) {
    throw new Error('A customer refund is being reviewed against your earnings. Please try again once the review is complete, or contact support.');
  }
}

/** A payout amount is immutable once requested: late deductions need a new request. */
export async function assertNoUnreservedRefundDeductions(
  tx: Prisma.TransactionClient,
  affiliateId: number,
  currency: string,
) {
  const deductions = await tx.$queryRaw<{ refundId: string }[]>`
    SELECT a.refundId FROM affiliate_refund_adjustments a
    JOIN affiliate_conversions c ON c.id=a.conversionId
    WHERE c.affiliateId=${affiliateId} AND a.currency=${currency}
      AND (c.status IN ('AVAILABLE','RESERVED','PAID') OR (c.status='VOIDED' AND EXISTS (SELECT 1 FROM affiliate_payout_items i JOIN affiliate_payouts p ON p.id=i.payoutId WHERE i.conversionId=c.id AND p.status='PAID')))
      AND a.payoutId IS NULL AND a.amount > 0
    LIMIT 1 FOR UPDATE`;
  if (deductions.length) {
    throw new Error('Refund deductions were added after this payout was requested. Cancel this payout and ask the affiliate to request the updated balance.');
  }
}
