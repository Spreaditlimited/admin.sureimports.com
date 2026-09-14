import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';

/** Only for historical requests without any settlement/provider allocation. */
export async function reopenLegacyRefundRequest(refundId: string, adminId: string, confirmedUnpaid: boolean) {
  if (!confirmedUnpaid) throw new Error('Review the bank and provider records and confirm no refund was sent before reopening this request.');
  return prisma.$transaction(async tx => {
    const [refund] = await tx.$queryRaw<{ refundStatus: string }[]>`SELECT refundStatus FROM refund_records WHERE pidRefund=${refundId} FOR UPDATE`;
    const settlements = await tx.$queryRaw<{ refundId: string }[]>`SELECT refundId FROM refund_settlements WHERE refundId=${refundId}`;
    const legs = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM refund_provider_legs WHERE refundId=${refundId}`;
    if (!refund || refund.refundStatus !== 'requested' || settlements.length || legs.length) throw new Error('Only an unprocessed historical request without settlement records can be reopened.');
    await tx.refund_records.update({ where: { pidRefund: refundId }, data: { refundStatus: 'pending', updatedAt: new Date() } });
    const id = randomUUID();
    const details = JSON.stringify({ confirmedUnpaid: true, reason: 'Historical request requires a frozen settlement destination or original-payment allocation.' });
    await tx.$executeRaw`INSERT INTO refund_events (id,refundId,eventType,actorPid,detailsJson) VALUES (${id},${refundId},'REQUEST_REOPENED',${adminId},${details})`;
    return { message: 'Request reopened. Ask the customer to open Refunds and choose their settlement method. No money has moved.' };
  });
}
