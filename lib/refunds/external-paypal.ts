import 'server-only';
import { prisma } from '@/lib/prisma';
import { paypalRefundRequest } from './paypal-client';
import { paypalCaptureReference } from './paypal-reference';
import { decimalUnits, majorAmount } from './money';
import { randomUUID } from 'node:crypto';

/** Persist evidence, not a guessed product/shipping allocation or a second refund. */
export async function recordExternalPayPalRefund(reference: string, expectedCapture: string, externalOrderReference?: string) {
  if (!/^[A-Za-z0-9]{5,50}$/.test(reference) || !expectedCapture) {
    throw new Error('Refund payment linkage requires review.');
  }
  const refund = await paypalRefundRequest(`/refunds/${reference}`);
  const captureId = paypalCaptureReference('PAYMENT.CAPTURE.REFUNDED', refund);
  if (refund.id !== reference || captureId !== expectedCapture) {
    throw new Error('Refund payment linkage could not be verified.');
  }
  const capture = await paypalRefundRequest(`/captures/${captureId}`);
  const currency = String(refund.amount?.currency_code || '');
  const amount = decimalUnits(String(refund.amount?.value || ''), 2);
  if (capture.id !== captureId || !/^[A-Z]{3}$/.test(currency)
    || capture.amount?.currency_code !== currency || amount <= BigInt(0)
    || amount > decimalUnits(String(capture.amount?.value || ''), 2)
    || !['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(refund.status)) {
    throw new Error('Refund amount or status could not be verified.');
  }
  const orderId = String(capture.supplementary_data?.related_ids?.order_id || '');
  const details = JSON.stringify({ providerReference: reference, captureId, orderId,
    currency, amount: majorAmount(amount), providerStatus: refund.status, ...(externalOrderReference ? { externalOrderReference } : {}) });
  const id = `PP_EXTERNAL:${reference}`;
  // The provider refund identity (not webhook identity) makes repeated delivery harmless.
  // Existing evidence is immutable: a later status must be checked during reconciliation.
  await prisma.$executeRaw`INSERT INTO refund_events (id,refundId,eventType,actorPid,detailsJson)
    VALUES (${id},${reference},'EXTERNAL_PAYPAL_REFUND','PAYPAL',${details})
    ON DUPLICATE KEY UPDATE id=id`;
}

/** A canonical failed/cancelled refund returned no money; retain evidence and lift only its review. */
export async function closeUnpaidExternalPayPalRefund(reference:string,adminId:string){
 if(!/^[A-Za-z0-9]{5,50}$/.test(reference))throw new Error('Enter a valid PayPal refund reference.');
 const provider=await paypalRefundRequest('/refunds/'+reference);
 const captureId=paypalCaptureReference('PAYMENT.CAPTURE.REFUNDED',provider);
 if(provider.id!==reference||!captureId||!['FAILED','CANCELLED'].includes(provider.status))throw new Error('PayPal has not confirmed this refund as failed or cancelled. The review remains open.');
 return prisma.$transaction(async tx=>{
  const id='PP_EXTERNAL:'+reference;
  const [event]=await tx.$queryRaw<Array<{detailsJson:string}>>`SELECT detailsJson FROM refund_events WHERE id=${id} AND eventType='EXTERNAL_PAYPAL_REFUND' FOR UPDATE`;
  if(!event)throw new Error('Refund review not found.');
  const evidence=JSON.parse(event.detailsJson);
  if(evidence.captureId!==captureId||evidence.currency!==provider.amount?.currency_code||decimalUnits(evidence.amount,2)!==decimalUnits(String(provider.amount?.value||''),2))throw new Error('The provider result does not match this refund review.');
  const settled=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM refund_provider_legs WHERE providerReference=${reference}`;
  if(settled.length)throw new Error('This refund already has a settlement allocation. Review that settlement instead.');
  const existing=await tx.$queryRaw<Array<{eventType:string}>>`SELECT eventType FROM refund_events WHERE id=${'RESOLVED:'+id}`;
  if(existing.length){if(existing[0].eventType!=='EXTERNAL_REFUND_NOT_PAID')throw new Error('This refund has already been reconciled differently.');return{message:'This failed or cancelled refund review is already closed.'};}
  await tx.$executeRaw`INSERT INTO refund_events (id,refundId,eventType,actorPid,detailsJson) VALUES (${'RESOLVED:'+id},${reference},'EXTERNAL_REFUND_NOT_PAID',${adminId},${JSON.stringify({captureId,providerStatus:provider.status})})`;
  return{message:'PayPal confirmed that no refund was completed. This review is closed; other payment or refund holds are unchanged.'};
 });
}

/** Link a provider-completed refund to an existing, classified procurement entitlement. */
export async function linkExternalPayPalRefund(reference: string, refundId: string, adminId: string) {
  if (!/^[A-Za-z0-9]{5,50}$/.test(reference) || !refundId || refundId.length > 191) throw new Error('Enter the existing refund reference.');
  const provider = await paypalRefundRequest(`/refunds/${reference}`);
  const captureId = paypalCaptureReference('PAYMENT.CAPTURE.REFUNDED', provider);
  if (provider.id !== reference || provider.status !== 'COMPLETED' || !captureId) throw new Error('PayPal has not confirmed this refund as completed.');
  const providerAmount = decimalUnits(String(provider.amount?.value || ''), 2);
  return prisma.$transaction(async tx => {
    // Same refund lock order as customer requests and commission reconciliation.
    const [refund] = await tx.$queryRaw<Array<{ pidUser: string; pidOrder: string; currency: string; amount: string; refundStatus: string; ext1: string; ext2: string; serviceType: string }>>`SELECT pidUser,pidOrder,currency,amount,refundStatus,ext1,ext2,serviceType FROM refund_records WHERE pidRefund=${refundId} FOR UPDATE`;
    const eventId = `PP_EXTERNAL:${reference}`;
    const [event] = await tx.$queryRaw<Array<{ detailsJson: string }>>`SELECT detailsJson FROM refund_events WHERE id=${eventId} AND eventType='EXTERNAL_PAYPAL_REFUND' FOR UPDATE`;
    const resolved = await tx.$queryRaw<Array<{ refundId: string }>>`SELECT refundId FROM refund_events WHERE id=${'RESOLVED:' + eventId}`;
    if (resolved.length) {
      if (resolved[0].refundId !== refundId) throw new Error('This PayPal refund is already linked to a different refund.');
      return { message: 'This PayPal refund has already been reconciled.' };
    }
    if (!event || !refund || !['pending','requested'].includes(refund.refundStatus)
      || refund.currency !== provider.amount?.currency_code || providerAmount <= BigInt(0)
      || decimalUnits(refund.amount, 2) !== providerAmount) throw new Error('The existing refund must match the PayPal currency and amount exactly and must not already be paid.');
    const evidence = JSON.parse(event.detailsJson);
    if (evidence.captureId !== captureId || evidence.currency !== refund.currency || decimalUnits(evidence.amount, 2) !== providerAmount) throw new Error('The PayPal refund does not match the recorded review.');
    let components;
    try { components = JSON.parse(refund.ext2); } catch { components = null; }
    if (refund.serviceType !== 'PROCUREMENT' || refund.ext1 !== 'ORDER_ADJUSTMENT'
      || components?.version !== 1 || !/^(?:0\.\d{8}|1\.00000000)$/.test(String(components.productRetentionRatio))) {
      throw new Error('This refund needs a product and shipping adjustment breakdown before it can be reconciled.');
    }
    const payments = await tx.$queryRaw<Array<{ pidPayment: string; amount: string; currency: string }>>`SELECT pidPayment,amount,currency FROM payments WHERE txID=${captureId} AND pidUser=${refund.pidUser} AND serviceID=${refund.pidOrder} AND paymentType='PAYPAL' AND paymentStatus='PAID' ORDER BY id FOR UPDATE`;
    if (payments.length !== 1 || payments[0].currency !== refund.currency || decimalUnits(String(payments[0].amount), 2) < providerAmount) throw new Error('The original payment does not belong to this customer and order.');
    const snapshots = await tx.$queryRaw<Array<{ refundId: string }>>`SELECT refundId FROM refund_settlements WHERE refundId=${refundId}`;
    const legs = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM refund_provider_legs WHERE refundId=${refundId} OR providerReference=${reference}`;
    if (snapshots.length || legs.length) throw new Error('This refund already has a settlement request. Review it before linking an external refund.');
    const [reserved] = await tx.$queryRaw<Array<{ amount: string | null }>>`SELECT SUM(amount) amount FROM refund_provider_legs WHERE captureId=${captureId} AND status<>'SUPERSEDED'`;
    if (decimalUnits(String(reserved?.amount || '0'), 2) + providerAmount > decimalUnits(String(payments[0].amount), 2)) throw new Error('Other refunds already use the remaining amount of this payment.');
    const amount = majorAmount(providerAmount);
    const legId = `RFP${randomUUID().replaceAll('-', '')}`;
    await tx.$executeRaw`INSERT INTO refund_settlements (refundId,pidUser,sourceCurrency,sourceAmount,settlementCurrency,settlementAmount,exchangeRate,method,destinationCiphertext,status,reference,approvedBy,settledAt) VALUES (${refundId},${refund.pidUser},${refund.currency},${amount},${refund.currency},${amount},1,'PAYPAL','','SETTLED',${reference},${adminId},NOW(3))`;
    await tx.$executeRaw`INSERT INTO refund_provider_legs (id,refundId,paymentId,captureId,currency,amount,status,providerReference,firstAttemptAt,checkedAt) VALUES (${legId},${refundId},${payments[0].pidPayment},${captureId},${refund.currency},${amount},'SETTLED',${reference},NOW(3),NOW(3))`;
    await tx.refund_records.update({ where: { pidRefund: refundId }, data: { refundStatus: 'refunded', xStatus: 'REFUNDED', updatedAt: new Date() } });
    const details = JSON.stringify({ providerReference: reference, captureId, amount, currency: refund.currency });
    await tx.$executeRaw`INSERT INTO refund_events (id,refundId,eventType,actorPid,detailsJson) VALUES (${'RESOLVED:' + eventId},${refundId},'EXTERNAL_REFUND_LINKED',${adminId},${details})`;
    return { message: 'Existing PayPal refund linked. No new refund was sent. Earnings reconciliation and customer notification will follow.' };
  });
}
