import 'server-only';
import { prisma } from '@/lib/prisma';
import { paypalRefundRequest } from './paypal-client';
import { paypalCaptureReference } from './paypal-reference';
import { decimalUnits,majorAmount } from './money';
/** Record money already returned after an administrator classifies its earning impact. */
export async function classifyExternalPayPalRefund(reference:string,adminId:string,input:{remainingEligiblePercent:string;reason:string;confirmed:boolean}){
 if(!/^[A-Za-z0-9]{5,50}$/.test(reference)||input.confirmed!==true||typeof input.reason!=='string'||input.reason.trim().length<20||input.reason.length>2000||!/^\d{1,3}(\.\d{1,6})?$/.test(input.remainingEligiblePercent))throw new Error('Confirm the refund classification and add a review note of 20–2000 characters.');
 const percentage=decimalUnits(input.remainingEligiblePercent,6);
 if(percentage>BigInt(100_000_000))throw new Error('The remaining eligible percentage must be between 0 and 100.');
 const retention=(Number(percentage)/100_000_000).toFixed(8);
 const provider=await paypalRefundRequest('/refunds/'+reference),capture=paypalCaptureReference('PAYMENT.CAPTURE.REFUNDED',provider);
 if(provider.id!==reference||provider.status!=='COMPLETED'||!capture)throw new Error('PayPal has not confirmed this refund as completed.');
 const currency=String(provider.amount?.currency_code||''),units=decimalUnits(String(provider.amount?.value||''),2),amount=majorAmount(units);
 if(!['NGN','USD'].includes(currency)||units<=BigInt(0))throw new Error('This refund currency needs a separate settlement review.');
 const refundId='EXTERNAL_PAYPAL_'+reference;
 return prisma.$transaction(async tx=>{
  const eventId='PP_EXTERNAL:'+reference;
  const [event]=await tx.$queryRaw<Array<{detailsJson:string}>>`SELECT detailsJson FROM refund_events WHERE id=${eventId} AND eventType='EXTERNAL_PAYPAL_REFUND' FOR UPDATE`;
  if(!event)throw new Error('Refund review not found.');
  const [resolved]=await tx.$queryRaw<Array<{refundId:string}>>`SELECT refundId FROM refund_events WHERE id=${'RESOLVED:'+eventId}`;
  if(resolved){if(resolved.refundId!==refundId)throw new Error('This refund was already reconciled using a different record.');return{message:'This existing refund has already been classified.',refundId};}
  const evidence=JSON.parse(event.detailsJson);
  if(evidence.captureId!==capture||evidence.currency!==currency||decimalUnits(evidence.amount,2)!==units)throw new Error('The provider result does not match this refund review.');
  const payments=await tx.$queryRaw<Array<{pidPayment:string;pidUser:string;serviceID:string;serviceName:string;amount:number;currency:string}>>`SELECT pidPayment,pidUser,serviceID,serviceName,amount,currency FROM payments WHERE txID=${capture} AND paymentType='PAYPAL' AND paymentStatus='PAID' ORDER BY id FOR UPDATE`;
  const payment=payments[0];
  if(payments.length!==1||!payment.pidUser||!payment.serviceID||!['PROCUREMENT','Invoice Payment'].includes(payment.serviceName)||payment.currency!==currency)throw new Error('The original customer and service payment need review.');
  const existing=await tx.$queryRaw<Array<{pidRefund:string}>>`SELECT pidRefund FROM refund_records WHERE pidUser=${payment.pidUser} AND pidOrder=${payment.serviceID} AND refundStatus IN ('pending','requested') LIMIT 1 FOR UPDATE`;
  if(existing.length)throw new Error('This order already has a refund request. Link the existing request instead to avoid recording the refund twice.');
  const legs=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM refund_provider_legs WHERE providerReference=${reference}`;if(legs.length)throw new Error('This refund already has a settlement allocation.');
  const [reserved]=await tx.$queryRaw<Array<{amount:string|null}>>`SELECT SUM(amount) amount FROM refund_provider_legs WHERE captureId=${capture} AND status<>'SUPERSEDED'`;
  if(decimalUnits(String(reserved?.amount||'0'),2)+units>decimalUnits(String(payment.amount),2))throw new Error('This refund exceeds the unallocated original payment.');
  const shipping=payment.serviceName==='Invoice Payment';
  const details=JSON.stringify({version:1,productRetentionRatio:retention,componentBasis:shipping?'SHIPPING_ELIGIBLE_UNITS':'PRODUCT_PRINCIPAL',reviewReason:input.reason.trim(),externalOrderReference:(shipping?'shipping-invoice:':'procurement:')+payment.serviceID});
  await tx.refund_records.create({data:{pidRefund:refundId,pidUser:payment.pidUser,pidOrder:payment.serviceID,amount,currency,refundStatus:'refunded',xStatus:'REFUNDED',serviceType:shipping?'SHIPPING_INVOICE':'PROCUREMENT',ext1:'ORDER_ADJUSTMENT',ext2:details,updatedAt:new Date()}});
  await tx.$executeRaw`INSERT INTO refund_settlements (refundId,pidUser,sourceCurrency,sourceAmount,settlementCurrency,settlementAmount,exchangeRate,method,destinationCiphertext,status,reference,approvedBy,settledAt) VALUES (${refundId},${payment.pidUser},${currency},${amount},${currency},${amount},1,'PAYPAL','','SETTLED',${reference},${adminId},NOW(3))`;
  await tx.$executeRaw`INSERT INTO refund_provider_legs (id,refundId,paymentId,captureId,currency,amount,status,providerReference,firstAttemptAt,checkedAt) VALUES (${'RFP_EXT_'+reference},${refundId},${payment.pidPayment},${capture},${currency},${amount},'SETTLED',${reference},NOW(3),NOW(3))`;
  await tx.$executeRaw`INSERT INTO refund_events (id,refundId,eventType,actorPid,detailsJson) VALUES (${'RESOLVED:'+eventId},${refundId},'EXTERNAL_REFUND_CLASSIFIED',${adminId},${details})`;
  return{message:'Existing refund recorded. No new refund was sent. Earnings reconciliation and notification are queued.',refundId};
 });
}
