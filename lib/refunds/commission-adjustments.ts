import 'server-only';
import { prisma } from '@/lib/prisma';
import { commissionReduction } from './components';
import { decimalUnits, majorAmount } from './money';
import { reconcilePaidCommissionReversals } from './full-reversals';

/** Separate debits preserve original commissions and already-completed payouts. */
export async function reconcileRefundCommissions() {
  await reconcilePaidCommissionReversals();
  const rows = await prisma.$queryRaw<{ pidRefund: string; pidOrder: string; serviceType:string; ext2: string; id: number }[]>`SELECT r.pidRefund,r.pidOrder,r.serviceType,r.ext2,r.id FROM refund_records r JOIN refund_settlements s ON s.refundId=r.pidRefund WHERE s.status='SETTLED' AND r.ext1='ORDER_ADJUSTMENT' AND r.serviceType IN ('PROCUREMENT','SHIPPING_INVOICE') AND EXISTS (SELECT 1 FROM affiliate_conversions c WHERE c.externalOrderReference=CONCAT(IF(r.serviceType='SHIPPING_INVOICE','shipping-invoice:','procurement:'),r.pidOrder)) AND NOT EXISTS (SELECT 1 FROM refund_events e WHERE e.id=CONCAT('COMMISSION:',r.pidRefund) OR e.id=CONCAT('COMMISSION_REVIEW:',r.pidRefund)) ORDER BY r.id LIMIT 25`;
  let completed = 0, reviewRequired = 0;
  for (const row of rows) {
    let snapshot;
    try { snapshot = JSON.parse(row.ext2); } catch { snapshot = null; }
    if (snapshot?.version !== 1 || !/^(?:0\.\d{8}|1\.00000000)$/.test(String(snapshot.productRetentionRatio))) {
      await prisma.$executeRaw`INSERT IGNORE INTO refund_events (id,refundId,eventType,actorPid,detailsJson) VALUES (${'COMMISSION_REVIEW:' + row.pidRefund},${row.pidRefund},'COMMISSION_REVIEW_REQUIRED','SYSTEM','{"reason":"Missing product-only adjustment snapshot"}')`;
      reviewRequired++; continue;
    }
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pidRefund FROM refund_records WHERE pidRefund=${row.pidRefund} FOR UPDATE`;
      const existing = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM refund_events WHERE id=${'COMMISSION:' + row.pidRefund}`;
      if (existing.length) return;
      const orderReference = `${row.serviceType==='SHIPPING_INVOICE'?'shipping-invoice':'procurement'}:${row.pidOrder}`;
      const conversions = await tx.$queryRaw<{ id: number; affiliateId: number; commissionCurrency: string; commissionAmount: string; status: string }[]>`SELECT id,affiliateId,commissionCurrency,commissionAmount,status FROM affiliate_conversions WHERE externalOrderReference=${orderReference} ORDER BY id FOR UPDATE`;
      for (const conversion of conversions) {
        if (conversion.status === 'VOIDED') continue;
        const [prior] = await tx.$queryRaw<{ amount: string | null }[]>`SELECT SUM(amount) amount FROM affiliate_refund_adjustments WHERE conversionId=${conversion.id}`;
        const remaining = decimalUnits(String(conversion.commissionAmount), 2) - decimalUnits(String(prior?.amount || '0'), 2);
        if (remaining < BigInt(0)) throw new Error('Refund commission reconciliation requires review.');
        const amount = commissionReduction(majorAmount(remaining), snapshot.productRetentionRatio);
        await tx.$executeRaw`INSERT INTO affiliate_refund_adjustments (refundId,conversionId,amount,currency) VALUES (${row.pidRefund},${conversion.id},${amount},${conversion.commissionCurrency})`;
      }
      // No linked conversion yet: leave it retryable, since attribution can arrive late.
      if (!conversions.length) return;
      const details = JSON.stringify({ productRetentionRatio: snapshot.productRetentionRatio, conversionIds: conversions.map(c => c.id) });
      await tx.$executeRaw`INSERT INTO refund_events (id,refundId,eventType,actorPid,detailsJson) VALUES (${'COMMISSION:' + row.pidRefund},${row.pidRefund},'COMMISSION_ADJUSTED','SYSTEM',${details})`;
      completed++;
    });
  }
  return { checked: rows.length, completed, reviewRequired };
}

