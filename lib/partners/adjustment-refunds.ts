import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { paypalRefundRequest } from '@/lib/refunds/paypal-client';
import { paypalCaptureReference } from '@/lib/refunds/paypal-reference';
import { adjustmentPaystack } from './adjustment-paystack';
import { AdjustmentError,adjustmentOrder,originalCheckout,settleAdjustment,type AdjustmentRow } from './adjustments';
type Part={id:string;adjustmentId:string;paymentId:string;provider:string;captureReference:string;currency:string;amountMinor:bigint;settlementAmountMinor:bigint;status:string;providerReference:string|null;attemptedAt:Date|null};
/** Reserve the reduction against verified payments; never change their original currency. */
export async function reserveAdjustmentRefund(id:string,recordExisting=false){
 return prisma.$transaction(async db=>{
  const [parent]=await db.$queryRaw<AdjustmentRow[]>`SELECT * FROM partner_order_adjustments WHERE id=${id}`;if(!parent)throw new AdjustmentError('Adjustment not found.',404);
  const order=await adjustmentOrder(db,parent.orderId);const checkout=originalCheckout(order);
  const [row]=await db.$queryRaw<AdjustmentRow[]>`SELECT * FROM partner_order_adjustments WHERE id=${id} FOR UPDATE`;
  if(!['REFUND_REQUIRED','REFUND_PROCESSING'].includes(row.status)||BigInt(row.deltaMinor)>=BigInt(0)||(order.paymentStatus!=='PAID'&&!(recordExisting&&order.paymentStatus==='DISPUTED')))throw new AdjustmentError('This adjustment is not ready for a refund.');
  const prior=await db.$queryRaw<Part[]>`SELECT * FROM partner_adjustment_refunds WHERE adjustmentId=${id} ORDER BY id`;
  if(prior.length)return prior;
  const payments=await db.$queryRaw<Array<{pidPayment:string;txID:string;txRef:string;paymentType:string;currency:string;amount:number}>>`SELECT pidPayment,txID,txRef,paymentType,currency,amount FROM payments WHERE serviceID=${order.id} AND pidUser=${order.customerPidUser} AND serviceName='PARTNER_PROCUREMENT' AND (paymentStatus='PAID' OR (${recordExisting} AND paymentStatus='DISPUTED')) ORDER BY id FOR UPDATE`;
  let outstanding=-BigInt(row.deltaMinor);
  for(const payment of payments){
   if(!['PAYPAL','PAYSTACK'].includes(payment.paymentType))throw new AdjustmentError('The original payment method requires a refund review.');
   const captured=BigInt(Math.round(payment.amount*100));
   let settlementTotal:bigint;
   if(payment.txRef===checkout.reference)settlementTotal=BigInt(checkout.totalMinor);
   else{const [supplement]=await db.$queryRaw<Array<{settlementAmountMinor:bigint}>>`SELECT settlementAmountMinor FROM partner_adjustment_payments WHERE id=${payment.txRef} AND status='PAID'`;if(!supplement)throw new AdjustmentError('An original payment needs reconciliation.');settlementTotal=BigInt(supplement.settlementAmountMinor);}
   const [used]=await db.$queryRaw<Array<{native:string|null;settlement:string|null}>>`SELECT SUM(amountMinor) native,SUM(settlementAmountMinor) settlement FROM partner_adjustment_refunds WHERE provider=${payment.paymentType} AND captureReference=${payment.txID} AND status<>'SUPERSEDED'`;
   const available=settlementTotal-BigInt(used?.settlement||'0');if(available<=BigInt(0))continue;
   const allocation=available<outstanding?available:outstanding;
   const amount=allocation===available?captured-BigInt(used?.native||'0'):(allocation*captured+settlementTotal/BigInt(2))/settlementTotal;
   if(amount<=BigInt(0)||amount+BigInt(used?.native||'0')>captured)throw new AdjustmentError('The refund conversion needs review.');
   await db.$executeRaw`INSERT INTO partner_adjustment_refunds (id,adjustmentId,paymentId,provider,captureReference,currency,amountMinor,settlementAmountMinor) VALUES (${'PARF_'+randomUUID()},${id},${payment.pidPayment},${payment.paymentType},${payment.txID},${payment.currency},${amount},${allocation})`;
   outstanding-=allocation;if(outstanding===BigInt(0))break;
  }
  if(outstanding!==BigInt(0))throw new AdjustmentError('The original payments do not cover this refund.');
  await db.$executeRaw`UPDATE partner_order_adjustments SET status='REFUND_PROCESSING',updatedAt=NOW(3) WHERE id=${id}`;
  return db.$queryRaw<Part[]>`SELECT * FROM partner_adjustment_refunds WHERE adjustmentId=${id} ORDER BY id`;
 });
}
async function checkPart(part:Part,initiate=false,recoveredReference?:string){
 if(part.status==='SETTLED'||part.status==='SUPERSEDED')return;
 let reference=part.providerReference||recoveredReference;
 if(reference&&!/^[A-Za-z0-9]{1,80}$/.test(reference))throw new AdjustmentError('Enter a valid provider refund reference.');
 if(recoveredReference&&(!part.attemptedAt||(part.providerReference&&part.providerReference!==recoveredReference)))throw new AdjustmentError('This refund is not awaiting reference recovery.');
 if(!reference){
  if(part.attemptedAt){
   // A lost response is recovered by immutable merchant identity, never another POST.
   let candidates:any[]=[];
   if(part.provider==='PAYPAL'){
    const capture=await paypalRefundRequest('/captures/'+part.captureReference);
    const orderId=String(capture.supplementary_data?.related_ids?.order_id||'');
    if(orderId){const order=await paypalRefundRequest('/orders/'+orderId);for(const entry of (order.purchase_units||[]).flatMap((u:any)=>u.payments?.refunds||[])){const refund=await paypalRefundRequest('/refunds/'+entry.id);if(refund.invoice_id===part.id)candidates.push(refund);}}
   }else{
    const refunds=await adjustmentPaystack('/refund?transaction='+encodeURIComponent(part.captureReference)+'&perPage=100');
    if(!Array.isArray(refunds)||refunds.length>=100)throw new AdjustmentError('Refund status needs a reference check.');
    candidates=refunds.filter((r:any)=>r.merchant_note===part.id);
   }
   if(candidates.length>1)throw new AdjustmentError('More than one provider refund matches this adjustment. Contact support for review.');
   if(!candidates.length)return;
   return checkPart(part,false,String(candidates[0].id));
  }
  if(!initiate)return;
  // Verify the capture before issuing a refund, and refuse untracked provider refunds.
  const payment=await prisma.payments.findUnique({where:{pidPayment:part.paymentId}});if(!payment)throw new AdjustmentError('Original payment not found.');
  if(part.provider==='PAYPAL'){
   const capture=await paypalRefundRequest('/captures/'+part.captureReference);
   if(capture.id!==part.captureReference||capture.amount?.currency_code!==part.currency||Math.round(Number(capture.amount.value)*100)!==Math.round(payment.amount*100)||!['COMPLETED','PARTIALLY_REFUNDED'].includes(capture.status))throw new AdjustmentError('The original payment requires review.');
   if(capture.status==='PARTIALLY_REFUNDED'){
    const providerOrder=String(capture.supplementary_data?.related_ids?.order_id||'');if(!providerOrder)throw new AdjustmentError('Earlier refunds require reconciliation.');
    const order=await paypalRefundRequest('/orders/'+providerOrder);const refunds=(order.purchase_units||[]).flatMap((unit:any)=>unit.payments?.refunds||[]).filter((refund:any)=>!['FAILED','CANCELLED'].includes(refund.status));
    const known=await prisma.$queryRaw<Array<{providerReference:string}>>`SELECT providerReference FROM partner_adjustment_refunds WHERE captureReference=${part.captureReference} AND status='SETTLED'`;
    if(!refunds.length||refunds.some((r:any)=>!known.some(k=>k.providerReference===r.id)))throw new AdjustmentError('An earlier PayPal refund must be reconciled first.');
   }
  }else{
   const verified=await adjustmentPaystack('/transaction/verify/'+encodeURIComponent(payment.txRef));
   if(verified.domain!=='live'||String(verified.id)!==part.captureReference||verified.currency!==part.currency||verified.amount!==Math.round(payment.amount*100))throw new AdjustmentError('The original payment requires review.');
   const refunds=await adjustmentPaystack('/refund?transaction='+encodeURIComponent(part.captureReference)+'&perPage=100');
   const known=await prisma.$queryRaw<Array<{providerReference:string}>>`SELECT providerReference FROM partner_adjustment_refunds WHERE captureReference=${part.captureReference} AND provider='PAYSTACK'`;
   if(!Array.isArray(refunds)||refunds.length>=100||refunds.some((r:any)=>!known.some(k=>k.providerReference===String(r.id))))throw new AdjustmentError('An earlier bank refund must be reconciled first.');
  }
  const claim=await prisma.$executeRaw`UPDATE partner_adjustment_refunds SET status='PROCESSING',attemptedAt=NOW(3),checkedAt=NOW(3) WHERE id=${part.id} AND attemptedAt IS NULL AND status='REQUESTED'`;if(!claim)return;
  const response=part.provider==='PAYPAL'
   ? await paypalRefundRequest('/captures/'+part.captureReference+'/refund',{amount:{currency_code:part.currency,value:(Number(part.amountMinor)/100).toFixed(2)},invoice_id:part.id},part.id)
   : await adjustmentPaystack('/refund',{transaction:part.captureReference,amount:Number(part.amountMinor),currency:part.currency,merchant_note:part.id,customer_note:'Refund for an approved order adjustment'});
  reference=String(response.id||'');if(!/^[A-Za-z0-9]{1,80}$/.test(reference))throw new AdjustmentError('The refund is being checked. Do not send another refund.');
  await prisma.$executeRaw`UPDATE partner_adjustment_refunds SET providerReference=${reference} WHERE id=${part.id} AND providerReference IS NULL`;
 }
 const provider=part.provider==='PAYPAL'?await paypalRefundRequest('/refunds/'+reference):await adjustmentPaystack('/refund/'+reference);
 const amount=part.provider==='PAYPAL'?Math.round(Number(provider.amount?.value)*100):Number(provider.amount);
 const currency=part.provider==='PAYPAL'?provider.amount?.currency_code:provider.currency;
 const capture=part.provider==='PAYPAL'?paypalCaptureReference('PAYMENT.CAPTURE.REFUNDED',provider):String(provider.transaction?.id||'');
 const identity=part.provider==='PAYPAL'?provider.invoice_id:provider.merchant_note;
 if(String(provider.id)!==reference||capture!==part.captureReference||amount!==Number(part.amountMinor)||currency!==part.currency||identity!==part.id||(part.provider==='PAYSTACK'&&provider.domain!=='live'&&provider.transaction?.domain!=='live'))throw new AdjustmentError('Provider refund details do not match this adjustment.');
 const status=part.provider==='PAYPAL'?provider.status==='COMPLETED'?'SETTLED':['FAILED','CANCELLED'].includes(provider.status)?'FAILED':'PROCESSING':provider.status==='processed'?'SETTLED':provider.status==='failed'?'FAILED':'PROCESSING';
 await prisma.$transaction(async db=>{
  const [parent]=await db.$queryRaw<AdjustmentRow[]>`SELECT * FROM partner_order_adjustments WHERE id=${part.adjustmentId}`;const order=await adjustmentOrder(db,parent.orderId);
  const [row]=await db.$queryRaw<AdjustmentRow[]>`SELECT * FROM partner_order_adjustments WHERE id=${part.adjustmentId} FOR UPDATE`;
  await db.$executeRaw`UPDATE partner_adjustment_refunds SET providerReference=${reference!},status=${status},checkedAt=NOW(3) WHERE id=${part.id} AND status NOT IN ('SETTLED','SUPERSEDED')`;
  const waiting=await db.$queryRaw<Array<{id:string}>>`SELECT id FROM partner_adjustment_refunds WHERE adjustmentId=${part.adjustmentId} AND status NOT IN ('SETTLED','SUPERSEDED')`;
  if(!waiting.length&&row.status!=='SETTLED')await settleAdjustment(db,order,row);
 });
}
export async function processAdjustmentRefund(id:string,initiate:boolean,recovery?:{partId:string;reference:string}){
 const parts=initiate?await reserveAdjustmentRefund(id):await prisma.$queryRaw<Part[]>`SELECT * FROM partner_adjustment_refunds WHERE adjustmentId=${id} ORDER BY id`;
 if(!parts.length)throw new AdjustmentError('No refund has been opened for this adjustment.');
 if(recovery&&!parts.some(p=>p.id===recovery.partId))throw new AdjustmentError('Refund part not found.',404);
 for(const part of parts)await checkPart(part,initiate,recovery?.partId===part.id?recovery.reference:undefined);
 return{message:'Refund status checked. Only confirmed provider refunds are marked complete.'};
}
export async function handleAdjustmentRefundEvent(provider:string,resource:any){
 const reference=String(resource?.id||'');const identity=provider==='PAYPAL'?String(resource?.invoice_id||''):String(resource?.merchant_note||'');
 const [part]=await prisma.$queryRaw<Part[]>`SELECT * FROM partner_adjustment_refunds WHERE provider=${provider} AND (providerReference=${reference} OR id=${identity}) LIMIT 1`;
 if(!part)return false;
 await checkPart(part,false,part.providerReference?undefined:reference);return true;
}
export async function reconcileAdjustmentRefunds(){
 const rows=await prisma.$queryRaw<Array<{id:string}>>`SELECT id FROM partner_order_adjustments WHERE status='REFUND_PROCESSING' ORDER BY updatedAt LIMIT 20`;
 const results=await Promise.allSettled(rows.map(async row=>{try{return await processAdjustmentRefund(row.id,false);}finally{await prisma.$executeRaw`UPDATE partner_order_adjustments SET updatedAt=NOW(3) WHERE id=${row.id} AND status='REFUND_PROCESSING'`;}}));return{checked:rows.length,statusChecksSucceeded:results.filter(r=>r.status==='fulfilled').length};
}

/** Only a canonical terminal failure may be replaced. Preparing never sends a refund. */
export async function prepareAdjustmentRefundRetry(id:string,partId:string,actor:string){
 const [part]=await prisma.$queryRaw<Part[]>`SELECT * FROM partner_adjustment_refunds WHERE id=${partId} AND adjustmentId=${id}`;
 if(!part||part.status!=='FAILED'||!part.providerReference)throw new AdjustmentError('Select a confirmed failed refund to prepare a retry.');
 await checkPart(part,false);
 return prisma.$transaction(async db=>{
  const [parent]=await db.$queryRaw<AdjustmentRow[]>`SELECT * FROM partner_order_adjustments WHERE id=${id}`;if(!parent)throw new AdjustmentError('Adjustment not found.',404);
  const order=await adjustmentOrder(db,parent.orderId);
  const [row]=await db.$queryRaw<AdjustmentRow[]>`SELECT * FROM partner_order_adjustments WHERE id=${id} FOR UPDATE`;
  const [current]=await db.$queryRaw<Part[]>`SELECT * FROM partner_adjustment_refunds WHERE id=${partId} AND adjustmentId=${id} FOR UPDATE`;
  if(row.status==='SETTLED'||current?.status!=='FAILED'||current.providerReference!==part.providerReference)throw new AdjustmentError('The earlier refund is not confirmed failed. Refresh before continuing.');
  const replacement='PARF_'+randomUUID();
  await db.$executeRaw`UPDATE partner_adjustment_refunds SET status='SUPERSEDED' WHERE id=${partId}`;
  await db.$executeRaw`INSERT INTO partner_adjustment_refunds (id,adjustmentId,paymentId,provider,captureReference,currency,amountMinor,settlementAmountMinor) VALUES (${replacement},${id},${part.paymentId},${part.provider},${part.captureReference},${part.currency},${part.amountMinor},${part.settlementAmountMinor})`;
  await db.$executeRaw`UPDATE partner_order_adjustments SET status='REFUND_REQUIRED',updatedAt=NOW(3) WHERE id=${id}`;
  await db.$executeRaw`INSERT INTO procurement_partner_order_events (id,customerOrderId,actorPid,action) VALUES (${randomUUID()},${order.id},${actor},'REFUND_RETRY_PREPARED')`;
  return{message:'The failed refund was verified. Approve the replacement attempt to send it; no new refund has been sent.'};
 });
}
