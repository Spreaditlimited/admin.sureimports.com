import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { decimalUnits, majorAmount } from './money';
import { protectRefundDestination } from './destination';

export async function recordLegacyManualRefund(input: { refundId:string; adminId:string; reference:string; amount:string; currency:string; recipient:string; reason:string; confirmed:boolean }) {
  if (!input.confirmed || input.reference.length < 6 || input.reference.length > 191 || input.recipient.length < 5 || input.recipient.length > 500 || input.reason.length < 10 || input.reason.length > 1000 || !/^\d+(\.\d{1,2})?$/.test(input.amount)) throw new Error('Confirm the completed payment and provide its exact amount, reference, recipient and payment evidence.');
  return prisma.$transaction(async tx => {
    const [refund] = await tx.$queryRaw<Array<{pidUser:string;amount:string;currency:string;refundStatus:string;xStatus:string|null}>>`SELECT pidUser,amount,currency,refundStatus,xStatus FROM refund_records WHERE pidRefund=${input.refundId} FOR UPDATE`;
    if (!refund || !['pending','requested'].includes(refund.refundStatus) || refund.xStatus === 'TEST_ARCHIVED') throw new Error('This refund is no longer awaiting payment. Refresh its status.');
    const settlements = await tx.$queryRaw<Array<{refundId:string}>>`SELECT refundId FROM refund_settlements WHERE refundId=${input.refundId}`;
    const legs = await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM refund_provider_legs WHERE refundId=${input.refundId}`;
    if (settlements.length || legs.length) throw new Error('This refund already has a settlement workflow. Use its existing payment details instead.');
    if (!['NGN','GBP','USD'].includes(refund.currency) || refund.currency !== input.currency || decimalUnits(input.amount,2) !== decimalUnits(refund.amount,2) || decimalUnits(input.amount,2) <= BigInt(0)) throw new Error('The paid amount and currency must exactly match this refund. Currency conversion requires a locked customer settlement.');
    const amount=majorAmount(decimalUnits(input.amount,2));
    const destination=protectRefundDestination({recipient:input.recipient,confirmedOwnAccount:true},input.refundId);
    await tx.$executeRaw`INSERT INTO refund_settlements (refundId,pidUser,sourceCurrency,sourceAmount,settlementCurrency,settlementAmount,exchangeRate,method,destinationCiphertext,status,reference,approvedBy,settledAt,createdAt,updatedAt) VALUES (${input.refundId},${refund.pidUser},${refund.currency},${amount},${refund.currency},${amount},1,'BANK',${destination},'SETTLED',${input.reference},${input.adminId},NOW(3),NOW(3),NOW(3))`;
    await tx.refund_records.update({where:{pidRefund:input.refundId},data:{refundStatus:'refunded',xStatus:'REFUNDED',updatedAt:new Date()}});
    const id=randomUUID(),details=JSON.stringify({reference:input.reference,amount,currency:refund.currency,reason:input.reason,previousStatus:refund.refundStatus});
    await tx.$executeRaw`INSERT INTO refund_events (id,refundId,eventType,actorPid,detailsJson) VALUES (${id},${input.refundId},'MANUAL_PAYMENT_RECORDED',${input.adminId},${details})`;
    await tx.$executeRaw`INSERT IGNORE INTO refund_notifications (refundId,eventType) VALUES (${input.refundId},'SETTLED')`;
    return {message:'Refund marked paid. It is now included in the payments ledger.'};
  });
}

export async function archiveTestRefund(input:{refundId:string;adminId:string;reason:string;confirmed:boolean}) {
  if (!input.confirmed || input.reason.length < 10 || input.reason.length > 1000) throw new Error('Confirm this is an unpaid test refund and provide a reason.');
  return prisma.$transaction(async tx=>{
    const [refund]=await tx.$queryRaw<Array<{refundStatus:string;xStatus:string|null}>>`SELECT refundStatus,xStatus FROM refund_records WHERE pidRefund=${input.refundId} FOR UPDATE`;
    if (!refund || !['pending','requested','cancelled','rejected'].includes(refund.refundStatus) || refund.xStatus==='TEST_ARCHIVED') throw new Error('Only unpaid, unarchived test refunds can be cleared. Paid and wallet refunds must remain in the financial history.');
    const settlements=await tx.$queryRaw<Array<{status:string;reference:string|null}>>`SELECT status,reference FROM refund_settlements WHERE refundId=${input.refundId} FOR UPDATE`;
    const legs=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM refund_provider_legs WHERE refundId=${input.refundId}`;
    if(legs.length || settlements.some(s=>!['REQUESTED','CANCELLED','FAILED'].includes(s.status)||s.reference)) throw new Error('This refund has payment activity. Reconcile it before clearing it; it cannot be archived as an unpaid test.');
    const id=randomUUID(),details=JSON.stringify({reason:input.reason,previousStatus:refund.refundStatus,previousXStatus:refund.xStatus,previousSettlementStatus:settlements[0]?.status||null});
    await tx.$executeRaw`INSERT INTO refund_events (id,refundId,eventType,actorPid,detailsJson) VALUES (${id},${input.refundId},'TEST_ARCHIVED',${input.adminId},${details})`;
    await tx.refund_records.update({where:{pidRefund:input.refundId},data:{refundStatus:'cancelled',xStatus:'TEST_ARCHIVED',updatedAt:new Date()}});
    await tx.$executeRaw`UPDATE refund_settlements SET status='CANCELLED',updatedAt=NOW(3) WHERE refundId=${input.refundId}`;
    await tx.$executeRaw`INSERT IGNORE INTO refund_notifications (refundId,eventType,status) VALUES (${input.refundId},'REQUESTED','SUPERSEDED')`;
    await tx.$executeRaw`UPDATE refund_notifications SET status='SUPERSEDED' WHERE refundId=${input.refundId} AND sentAt IS NULL`;
    return {message:'Test refund archived. Its audit history is preserved.'};
  });
}
