import 'server-only';
import { prisma } from '@/lib/prisma';
import { decimalUnits, majorAmount } from './money';

/** Recover only earnings actually paid, less every earlier partial-refund deduction. */
export async function reconcilePaidCommissionReversals() {
  return prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{ id: number; commissionAmount: string; commissionCurrency: string }>>`
      SELECT c.id,c.commissionAmount,c.commissionCurrency FROM affiliate_conversions c
      WHERE c.status='VOIDED'
        AND EXISTS (SELECT 1 FROM affiliate_payout_items i JOIN affiliate_payouts p ON p.id=i.payoutId WHERE i.conversionId=c.id AND p.status='PAID')
        AND NOT EXISTS (SELECT 1 FROM affiliate_refund_adjustments a WHERE a.conversionId=c.id AND a.refundId=CONCAT('FULL_REVERSAL:',c.id))
      ORDER BY c.id FOR UPDATE`;
    for (const row of rows) {
      const [prior] = await tx.$queryRaw<Array<{ amount: string | null }>>`SELECT SUM(amount) amount FROM affiliate_refund_adjustments WHERE conversionId=${row.id}`;
      const remaining = decimalUnits(String(row.commissionAmount), 2) - decimalUnits(String(prior?.amount || '0'), 2);
      if (remaining < BigInt(0)) throw new Error('Commission recovery requires review.');
      await tx.$executeRaw`INSERT INTO affiliate_refund_adjustments (refundId,conversionId,amount,currency) VALUES (${'FULL_REVERSAL:' + row.id},${row.id},${majorAmount(remaining)},${row.commissionCurrency})`;
    }
    return rows.length;
  });
}
