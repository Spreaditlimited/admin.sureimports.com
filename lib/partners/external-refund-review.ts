import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { paypalRefundRequest } from '@/lib/refunds/paypal-client';
import { paypalCaptureReference } from '@/lib/refunds/paypal-reference';
import { adjustmentPaystack } from './adjustment-paystack';
import { AdjustmentError,adjustmentOrder,settleAdjustment,type AdjustmentRow } from './adjustments';
import { reserveAdjustmentRefund } from './adjustment-refunds';

async function canonical(provider:string,reference:string){
 if(!['PAYPAL','PAYSTACK'].includes(provider)||!/^[A-Za-z0-9]{1,80}$/.test(reference))throw new AdjustmentError('Choose a provider and enter its refund reference.',422);
 const result=provider==='PAYPAL'?await paypalRefundRequest('/refunds/'+reference):await adjustmentPaystack('/refund/'+reference);
 const capture=provider==='PAYPAL'?paypalCaptureReference('PAYMENT.CAPTURE.REFUNDED',result):String(result.transaction?.id||'');
 const currency=provider==='PAYPAL'?result.amount?.currency_code:result.currency;
 const minor=provider==='PAYPAL'?Math.round(Number(result.amount?.value)*100):Number(result.amount);
 if(String(result.id)!==reference||!capture||!Number.isSafeInteger(minor)||minor<=0||(provider==='PAYSTACK'&&result.domain!=='live'&&result.transaction?.domain!=='live'))throw new AdjustmentError('The provider refund could not be verified.');
 return{capture,currency,minor,complete:provider==='PAYPAL'?result.status==='COMPLETED':result.status==='processed'};
}
/** Record money already returned against an explicitly approved price reduction. No refund POST. */
export async function linkExistingAdjustmentRefund(id:string,provider:string,reference:string,actor:string){
 const verified=await canonical(provider,reference);if(!verified.complete)throw new AdjustmentError('The provider has not confirmed this refund as completed.');
 const [recorded]=await prisma.$queryRaw<Array<{adjustmentId:string;status:string}>>`SELECT adjustmentId,status FROM partner_adjustment_refunds WHERE provider=${provider} AND providerReference=${reference}`;
 if(recorded){if(recorded.adjustmentId===id&&recorded.status==='SETTLED')return{message:'This existing refund is already recorded.'};throw new AdjustmentError('This provider refund already belongs to another allocation.');}
 const parts=await reserveAdjustmentRefund(id,true);
 const part=parts.find(p=>p.provider===provider&&p.captureReference===verified.capture&&p.currency===verified.currency&&Number(p.amountMinor)===verified.minor&&(!p.providerReference||p.providerReference===reference));
 if(!part)throw new AdjustmentError('The existing refund does not exactly match an approved payment allocation. Check the reduction and original payment.');
 if(part.attemptedAt&&!part.providerReference)throw new AdjustmentError('Recover the submitted refund reference before recording a separate external refund.');
 return prisma.$transaction(async db=>{
  const [parent]=await db.$queryRaw<AdjustmentRow[]>`SELECT * FROM partner_order_adjustments WHERE id=${id}`;
  const order=await adjustmentOrder(db,parent.orderId);
  const [row]=await db.$queryRaw<AdjustmentRow[]>`SELECT * FROM partner_order_adjustments WHERE id=${id} FOR UPDATE`;
  const [current]=await db.$queryRaw<Array<{status:string;providerReference:string|null;attemptedAt:Date|null}>>`SELECT status,providerReference,attemptedAt FROM partner_adjustment_refunds WHERE id=${part.id} FOR UPDATE`;
  if(current.status==='SETTLED'&&current.providerReference===reference)return{message:'This existing refund is already recorded.'};
  if(current.status!=='REQUESTED'||current.attemptedAt||current.providerReference)throw new AdjustmentError('The refund allocation changed. Refresh before recording it.');
  const duplicate=await db.$queryRaw<Array<{id:string}>>`SELECT id FROM partner_adjustment_refunds WHERE provider=${provider} AND providerReference=${reference}`;
  if(duplicate.length)throw new AdjustmentError('This provider refund has already been allocated.');
  await db.$executeRaw`UPDATE partner_adjustment_refunds SET status='SETTLED',providerReference=${reference},checkedAt=NOW(3) WHERE id=${part.id}`;
  await db.$executeRaw`INSERT INTO procurement_partner_order_events (id,customerOrderId,actorPid,action) VALUES (${randomUUID()},${order.id},${actor},'EXTERNAL_REFUND_RECORDED')`;
  const pending=await db.$queryRaw<Array<{id:string}>>`SELECT id FROM partner_adjustment_refunds WHERE adjustmentId=${id} AND status NOT IN ('SETTLED','SUPERSEDED')`;
  if(!pending.length&&row.status!=='SETTLED')await settleAdjustment(db,order,row);
  return{message:'The completed provider refund has been recorded. No new refund was sent. Any payment hold still requires a separate review.'};
 });
}
/** A manual hold release must not discard an unclassified provider refund. */
export async function assertExternalRefundsRecorded(orderId:string){
 const payments=await prisma.payments.findMany({where:{serviceID:orderId,serviceName:'PARTNER_PROCUREMENT',paymentStatus:{in:['PAID','DISPUTED']}},select:{txID:true,txRef:true,paymentType:true}});
 for(const payment of payments){
  let refunds:any[];
  if(payment.paymentType==='PAYPAL'){
   const capture=await paypalRefundRequest('/captures/'+payment.txID);
   if(capture.id!==payment.txID||!['COMPLETED','PARTIALLY_REFUNDED','REFUNDED'].includes(capture.status))throw new AdjustmentError('The original payment still requires provider review.');
   const providerOrder=String(capture.supplementary_data?.related_ids?.order_id||'');
   if(!providerOrder)throw new AdjustmentError('The original payment history needs reconciliation before release.');
   const order=await paypalRefundRequest('/orders/'+providerOrder);
   refunds=(order.purchase_units||[]).filter((unit:any)=>unit.payments?.captures?.some((c:any)=>c.id===payment.txID)).flatMap((unit:any)=>unit.payments?.refunds||[]).filter((refund:any)=>!['FAILED','CANCELLED'].includes(refund.status));
  }else if(payment.paymentType==='PAYSTACK'){
   refunds=await adjustmentPaystack('/refund?transaction='+encodeURIComponent(payment.txID)+'&perPage=100');
   if(!Array.isArray(refunds)||refunds.length>=100)throw new AdjustmentError('The provider refund history needs reconciliation before release.');
   refunds=refunds.filter((refund:any)=>refund.status!=='failed');
  }else throw new AdjustmentError('The original payment method needs a refund review.');
  const known=await prisma.$queryRaw<Array<{providerReference:string}>>`SELECT providerReference FROM partner_adjustment_refunds WHERE captureReference=${payment.txID} AND provider=${payment.paymentType} AND status='SETTLED'`;
  if(refunds.some(refund=>!known.some(part=>part.providerReference===String(refund.id))))throw new AdjustmentError('Record every completed provider refund against an approved order adjustment before releasing this earning. Pending refunds must finish first.');
 }
}
