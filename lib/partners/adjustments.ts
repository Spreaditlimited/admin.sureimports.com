import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decryptKyc } from './kyc-crypto';
import { adjustedCost, adjustmentDelta, partnerNetEarnings, type AdjustmentCost } from './adjustment-policy';

export class AdjustmentError extends Error { constructor(message: string,public status=409){super(message);} }
type DB=Prisma.TransactionClient;
type Order={id:string;partnerId:string;customerPidUser:string;paymentStatus:string;releasedOrderId:string|null;checkoutCiphertext:string;ownerPidUser:string;slug:string;partnerStatus:string};
export type AdjustmentRow={id:string;orderId:string;revision:number;status:string;currency:string;beforeJson:string;afterJson:string;deltaMinor:bigint;reason:string;reviewNote:string|null;createdAt:Date};
type Row=AdjustmentRow;
export async function adjustmentOrder(db:DB,id:string,lock=true){
 const query=lock
  ? db.$queryRaw<Order[]>`SELECT o.*,p.ownerPidUser,p.slug,p.status AS partnerStatus FROM procurement_partner_customer_orders o JOIN procurement_partners p ON p.id=o.partnerId WHERE o.id=${id} FOR UPDATE`
  : db.$queryRaw<Order[]>`SELECT o.*,p.ownerPidUser,p.slug,p.status AS partnerStatus FROM procurement_partner_customer_orders o JOIN procurement_partners p ON p.id=o.partnerId WHERE o.id=${id}`;
 const [row]=await query;if(!row)throw new AdjustmentError('Order not found.',404);return row;
}
export function originalCheckout(order:Order){return JSON.parse(decryptKyc(Buffer.from(order.checkoutCiphertext,'base64'),`customer-checkout:${order.partnerId}:${order.id}`).toString('utf8')) as {cost:AdjustmentCost;processingFeeMinor:number;reference:string;provider?:string;chargeMinor?:number;totalMinor:number;nairaPerUsd?:number};}
export async function adjustmentEvent(db:DB,order:Order,actor:string,action:string){
 const id=randomUUID();await db.$executeRaw`INSERT INTO procurement_partner_order_events (id,customerOrderId,actorPid,action) VALUES (${id},${order.id},${actor},${action})`;
 // The business receives operational notices; its customer sees their own order dashboard.
 await db.$executeRaw`INSERT INTO procurement_partner_kyc_events (id,partnerId,actorPid,action,emailStatus) SELECT ${id},${order.partnerId},${actor},${action},'QUEUED' FROM procurement_partner_kyc WHERE partnerId=${order.partnerId}`;
}
export async function orderAdjustments(id:string,actor:{kind:'admin'|'partner'|'customer';pid:string;slug?:string}){
 const order=await adjustmentOrder(prisma,id,false);
 if((actor.kind==='partner'&&order.ownerPidUser!==actor.pid)||(actor.kind==='customer'&&(order.customerPidUser!==actor.pid||order.slug!==actor.slug)))throw new AdjustmentError('Order not found.',404);
 const rows=await prisma.$queryRaw<Row[]>`SELECT * FROM partner_order_adjustments WHERE orderId=${id} ORDER BY revision DESC`;
 const safe=(cost:AdjustmentCost)=>({productCostMinor:cost.productCostMinor,shippingMinor:cost.shippingMinor,serviceChargeMinor:cost.serviceChargeMinor,taxMinor:cost.taxMinor,orderTotalMinor:cost.orderTotalMinor});
 return rows.filter(row=>actor.kind!=='customer'||!['AWAITING_PARTNER','REJECTED'].includes(row.status)).map(row=>({id:row.id,revision:row.revision,status:row.status,currency:row.currency,deltaMinor:String(row.deltaMinor),reason:row.reason,reviewNote:actor.kind==='customer'?null:row.reviewNote,createdAt:row.createdAt,before:safe(JSON.parse(row.beforeJson)),after:safe(JSON.parse(row.afterJson))}));
}
export async function proposeAdjustment(id:string,actor:string,input:{revision:number;productCostMinor:number;shippingMinor:number;reason:string}){
 return prisma.$transaction(db=>proposeAdjustmentInTransaction(db,id,actor,input));
}
export async function proposeAdjustmentInTransaction(db:DB,id:string,actor:string,input:{revision:number;productCostMinor:number;shippingMinor:number;reason:string}){
 if(!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.reason!=='string'||input.reason.trim().length<10||input.reason.length>2000)throw new AdjustmentError('Describe the reason for the revised product or shipping costs (10–2000 characters).',422);
  const order=await adjustmentOrder(db,id);
  if(!['PAID','DISPUTED'].includes(order.paymentStatus)||!order.releasedOrderId)throw new AdjustmentError('Adjustments require a paid order approved for processing.');
  await db.$executeRaw`INSERT INTO partner_wallet_accounts (partnerId) VALUES (${order.partnerId}) ON DUPLICATE KEY UPDATE partnerId=VALUES(partnerId)`;
  await db.$queryRaw`SELECT partnerId FROM partner_wallet_accounts WHERE partnerId=${order.partnerId} FOR UPDATE`;
  const sending=await db.$queryRaw<Array<{id:string}>>`SELECT id FROM partner_wallet_withdrawals WHERE partnerId=${order.partnerId} AND status IN ('PROCESSING','OTP_REQUIRED') LIMIT 1 FOR UPDATE`;
  if(sending.length)throw new AdjustmentError('A withdrawal is awaiting bank confirmation. Reconcile it before proposing an order adjustment.');
  const [latest]=await db.$queryRaw<Row[]>`SELECT * FROM partner_order_adjustments WHERE orderId=${id} ORDER BY revision DESC LIMIT 1 FOR UPDATE`;
  if((latest?.revision||0)!==input.revision)throw new AdjustmentError('This order changed. Refresh before proposing another adjustment.');
  if(latest&&!['SETTLED','REJECTED'].includes(latest.status))throw new AdjustmentError('Complete or reject the current adjustment before proposing another.');
  const [previous]=await db.$queryRaw<Row[]>`SELECT * FROM partner_order_adjustments WHERE orderId=${id} AND status='SETTLED' ORDER BY revision DESC LIMIT 1`;
  const before:AdjustmentCost=previous?JSON.parse(previous.afterJson):originalCheckout(order).cost;
  let after:AdjustmentCost;try{after=adjustedCost(before,input.productCostMinor,input.shippingMinor);}catch{throw new AdjustmentError('Check the product and shipping amounts and the original pricing.',422);}
  const delta=adjustmentDelta(before,after);
  if(delta===0&&before.productCostMinor===after.productCostMinor&&before.shippingMinor===after.shippingMinor)throw new AdjustmentError('There is no price change to review.',422);
  const adjustmentId='PADJ_'+randomUUID();
  await db.$executeRaw`INSERT INTO partner_order_adjustments (id,orderId,revision,currency,beforeJson,afterJson,deltaMinor,reason,proposedBy) VALUES (${adjustmentId},${id},${input.revision+1},${before.currency},${JSON.stringify(before)},${JSON.stringify(after)},${BigInt(delta)},${input.reason.trim()},${actor})`;
  await adjustmentEvent(db,order,actor,'ORDER_ADJUSTMENT_PROPOSED');return {id:adjustmentId};
}
export async function refreshOrderEarnings(db:DB,order:Order,cost:AdjustmentCost){
 await db.$executeRaw`INSERT INTO partner_wallet_accounts (partnerId) VALUES (${order.partnerId}) ON DUPLICATE KEY UPDATE partnerId=VALUES(partnerId)`;
 await db.$queryRaw`SELECT partnerId FROM partner_wallet_accounts WHERE partnerId=${order.partnerId} FOR UPDATE`;
 const fees=await db.$queryRaw<Array<{feeMinor:bigint;customerFeeMinor:bigint}>>`SELECT feeMinor,customerFeeMinor FROM partner_order_payment_fees WHERE orderId=${order.id}`;
 if(!fees.length)throw new AdjustmentError('The payment processing fee must be confirmed before earnings can be reconciled.');
 const net=partnerNetEarnings(cost.partnerEarningsMinor,fees);
 await db.$executeRaw`UPDATE partner_wallet_credits SET amountMinor=${BigInt(net)},updatedAt=NOW(3) WHERE orderId=${order.id} AND state<>'REVERSED'`;
}
export async function settleAdjustment(db:DB,order:Order,row:Row){
 const cost:AdjustmentCost=JSON.parse(row.afterJson);
 await refreshOrderEarnings(db,order,cost);
 const rate=cost.currency==='GBP'?Number(cost.config.gbpPerUsd):Number(cost.config.ngnPerUsd);
 if(!Number.isFinite(rate)||rate<=0)throw new AdjustmentError('The original exchange rate needs review.');
 if(order.releasedOrderId)await db.orders.update({where:{pidOrder:order.releasedOrderId},data:{orderTotalCost:String(cost.orderTotalMinor/100/rate),orderShippingCost:String(cost.shippingMinor/100/rate),updatedAt:new Date()}});
 await db.$executeRaw`UPDATE partner_order_adjustments SET status='SETTLED',settledAt=NOW(3),updatedAt=NOW(3) WHERE id=${row.id}`;
 if(order.releasedOrderId)await db.orders.updateMany({where:{pidOrder:order.releasedOrderId,status:'pay-for-shipping',orderType:'PARTNER_PROCUREMENT'},data:{status:cost.orderTotalMinor===0?'on-hold':'in-transit',updatedAt:new Date()}});
 await adjustmentEvent(db,order,'SYSTEM','ORDER_ADJUSTMENT_SETTLED');
}
export async function reviewAdjustment(id:string,adjustmentId:string,ownerPid:string,revision:number,approve:boolean,note:string){
 if(typeof approve!=='boolean'||typeof note!=='string'||note.length>2000||(!approve&&note.trim().length<10))throw new AdjustmentError('Add a clear reason when rejecting an adjustment.',422);
 return prisma.$transaction(async db=>{
  const order=await adjustmentOrder(db,id);if(order.ownerPidUser!==ownerPid||order.partnerStatus!=='ACTIVE')throw new AdjustmentError('Order not found.',404);
  const [row]=await db.$queryRaw<Row[]>`SELECT * FROM partner_order_adjustments WHERE id=${adjustmentId} AND orderId=${id} FOR UPDATE`;
  if(!row||row.revision!==revision||row.status!=='AWAITING_PARTNER')throw new AdjustmentError('Refresh this adjustment before reviewing it.');
  const status=!approve?'REJECTED':BigInt(row.deltaMinor)>BigInt(0)?'AWAITING_PAYMENT':BigInt(row.deltaMinor)<BigInt(0)?'REFUND_REQUIRED':'APPROVED';
  await db.$executeRaw`UPDATE partner_order_adjustments SET status=${status},reviewedBy=${ownerPid},reviewNote=${note.trim()},reviewedAt=NOW(3),updatedAt=NOW(3) WHERE id=${row.id}`;
  if(status==='APPROVED')await settleAdjustment(db,order,row);
  if(status==='REJECTED'&&order.releasedOrderId)await db.orders.updateMany({where:{pidOrder:order.releasedOrderId,status:'pay-for-shipping',orderType:'PARTNER_PROCUREMENT'},data:{status:'approved',updatedAt:new Date()}});
  await adjustmentEvent(db,order,ownerPid,approve?'ORDER_ADJUSTMENT_APPROVED':'ORDER_ADJUSTMENT_REJECTED');return{status:status==='APPROVED'?'SETTLED':status};
 });
}
export async function assertOrderFinanciallyClear(db:DB,id:string){
 const unsettled=await db.$queryRaw<Array<{id:string}>>`SELECT id FROM partner_order_adjustments WHERE orderId=${id} AND status NOT IN ('SETTLED','REJECTED') LIMIT 1`;
 if(unsettled.length)throw new AdjustmentError('Complete the outstanding order adjustment before confirming receipt or releasing earnings.');
 const [order]=await db.$queryRaw<Array<{checkoutReference:string}>>`SELECT checkoutReference FROM procurement_partner_customer_orders WHERE id=${id}`;
 const fees=await db.$queryRaw<Array<{paymentReference:string}>>`SELECT paymentReference FROM partner_order_payment_fees WHERE orderId=${id} AND paymentReference=${order?.checkoutReference||''}`;
 if(!fees.length)throw new AdjustmentError('Payment reconciliation is still in progress. Please check again shortly.');
}

/** Caller holds the wallet row. The shared lock serializes proposals and withdrawal submission. */
export async function assertPartnerFinanciallyClear(db:DB,partnerId:string){
 const rows=await db.$queryRaw<Array<{id:string}>>`SELECT a.id FROM partner_order_adjustments a JOIN procurement_partner_customer_orders o ON o.id=a.orderId WHERE o.partnerId=${partnerId} AND a.status NOT IN ('SETTLED','REJECTED') LIMIT 1 FOR UPDATE`;
 if(rows.length)throw new AdjustmentError('An order adjustment needs to be completed before earnings can be withdrawn. Open Orders to review the next step.');
 const missing=await db.$queryRaw<Array<{id:string}>>`SELECT o.id FROM procurement_partner_customer_orders o JOIN partner_wallet_credits c ON c.orderId=o.id LEFT JOIN partner_order_payment_fees f ON f.paymentReference=o.checkoutReference WHERE o.partnerId=${partnerId} AND c.state='AVAILABLE' AND f.paymentReference IS NULL LIMIT 1 FOR UPDATE`;
 if(missing.length)throw new AdjustmentError('Payment reconciliation is still in progress. Please check again shortly.');
}

export async function recordOrderPaymentFee(db:DB,orderId:string,reference:string,feeMinor:number,customerFeeMinor:number){
 if(!Number.isSafeInteger(feeMinor)||feeMinor<0||!Number.isSafeInteger(customerFeeMinor)||customerFeeMinor<0)throw new AdjustmentError('Payment fee reconciliation is not yet complete.');
 const order=await adjustmentOrder(db,orderId);
 const checkout=originalCheckout(order);
 const [existing]=await db.$queryRaw<Array<{feeMinor:bigint;customerFeeMinor:bigint}>>`SELECT feeMinor,customerFeeMinor FROM partner_order_payment_fees WHERE paymentReference=${reference}`;
 if(existing){if(BigInt(existing.feeMinor)!==BigInt(feeMinor)||BigInt(existing.customerFeeMinor)!==BigInt(customerFeeMinor))throw new AdjustmentError('The payment fee changed and needs review.');return;}
 await db.$executeRaw`INSERT INTO partner_order_payment_fees (paymentReference,orderId,currency,feeMinor,customerFeeMinor) VALUES (${reference},${orderId},${checkout.cost.currency},${BigInt(feeMinor)},${BigInt(customerFeeMinor)})`;
 const [latest]=await db.$queryRaw<Row[]>`SELECT * FROM partner_order_adjustments WHERE orderId=${orderId} AND status='SETTLED' ORDER BY revision DESC LIMIT 1`;
 await refreshOrderEarnings(db,order,latest?JSON.parse(latest.afterJson):checkout.cost);
}
