import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { paypalRefundRequest } from './paypal-client';
import { paypalCaptureReference } from './paypal-reference';
import { validatedRefundStatus } from './paypal-policy';
type Leg={id:string;refundId:string;paymentId:string;captureId:string;currency:string;amount:string;status:string;providerReference:string|null};
/** Prepare a new attempt only when the old provider refund is canonically terminal and unpaid. */
export async function prepareFailedPayPalRetry(refundId:string,legId:string,adminId:string){
 const [original]=await prisma.$queryRaw<Leg[]>`SELECT * FROM refund_provider_legs WHERE id=${legId} AND refundId=${refundId}`;
 if(!original||original.status!=='FAILED'||!original.providerReference)throw new Error('Select a failed refund with a confirmed provider reference.');
 const provider=await paypalRefundRequest('/refunds/'+original.providerReference);
 if(provider.id!==original.providerReference||paypalCaptureReference('PAYMENT.CAPTURE.REFUNDED',provider)!==original.captureId||validatedRefundStatus(provider,{captureId:original.captureId,currency:original.currency,amount:String(original.amount),requestId:original.id})!=='FAILED')throw new Error('PayPal has not confirmed that the earlier attempt failed without returning money.');
 return prisma.$transaction(async tx=>{
  const [settlement]=await tx.$queryRaw<Array<{status:string;method:string}>>`SELECT status,method FROM refund_settlements WHERE refundId=${refundId} FOR UPDATE`;
  const [current]=await tx.$queryRaw<Leg[]>`SELECT * FROM refund_provider_legs WHERE id=${legId} AND refundId=${refundId} FOR UPDATE`;
  if(!settlement||settlement.method!=='PAYPAL'||settlement.status==='SETTLED'||current?.status!=='FAILED'||current.providerReference!==original.providerReference)throw new Error('The refund changed. Refresh before retrying.');
  const id='RFP'+randomUUID().replaceAll('-','');
  await tx.$executeRaw`UPDATE refund_provider_legs SET status='SUPERSEDED',updatedAt=NOW(3) WHERE id=${legId}`;
  await tx.$executeRaw`INSERT INTO refund_provider_legs (id,refundId,paymentId,captureId,currency,amount) VALUES (${id},${refundId},${current.paymentId},${current.captureId},${current.currency},${current.amount})`;
  await tx.$executeRaw`INSERT INTO refund_events (id,refundId,eventType,actorPid,detailsJson) VALUES (${randomUUID()},${refundId},'FAILED_PAYPAL_RETRY_PREPARED',${adminId},${JSON.stringify({previousLeg:legId,previousReference:current.providerReference,newLeg:id})})`;
  return{message:'The failed attempt was verified and retained in the history. Approve the newly prepared refund attempt to send it; no new money has been sent yet.'};
 });
}

