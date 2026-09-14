import 'server-only';
import { prisma } from '@/lib/prisma';
import { AdjustmentError,adjustmentOrder,originalCheckout,proposeAdjustmentInTransaction,assertOrderFinanciallyClear,adjustmentEvent,type AdjustmentRow } from './adjustments';
/** Intercept partner-owned procurement before the main site's customer billing flow. */
export async function partnerOperationalTransition(form:FormData,actor:string){
 const pidOrder=String(form.get('pidOrder')||'');
 const [found]=await prisma.$queryRaw<Array<{id:string}>>`SELECT id FROM procurement_partner_customer_orders WHERE releasedOrderId=${pidOrder}`;
 if(!found)return null;
 return prisma.$transaction(async db=>{
  const order=await adjustmentOrder(db,found.id);
  const [operational]=await db.$queryRaw<Array<{status:string;pidUser:string}>>`SELECT status,pidUser FROM orders WHERE pidOrder=${pidOrder} FOR UPDATE`;
  if(!operational||operational.pidUser!==String(form.get('pidUser')||''))throw new AdjustmentError('Order not found.',404);
  const requested=String(form.get('newStatus')||''),current=String(form.get('currentStatus')||'');
  if(current!==operational.status)throw new AdjustmentError('This order changed. Refresh before continuing.');
  const transitions:Record<string,string[]>={pending:['approved','on-hold'],approved:['pay-for-shipping','on-hold'],'pay-for-shipping':['revert_to_approved','on-hold'],'in-transit':['ready-for-pickup','on-hold'],'ready-for-pickup':['completed','on-hold'],'on-hold':['pending','cancelled']};
  if(requested==='message'){
   const message=String(form.get('message')||'').trim();if(message.length<3||message.length>2000)throw new AdjustmentError('Enter a message of 3–2000 characters.',422);
   // Store in the existing business conversation. Never address the partner's customer.
   const business=await db.users.findUnique({where:{pidUser:order.ownerPidUser},select:{userEmail:true}});if(!business?.userEmail)throw new AdjustmentError('The business contact needs review before sending this message.');
   await db.messages.create({data:{pidMessage:crypto.randomUUID(),pidOrder,pidFrom:'hello@sureimports.com',pidTo:business.userEmail,messageTitle:'Order update',messageContent:message,messageStatus:'unread',createdAt:new Date()}});
   await adjustmentEvent(db,order,actor,'ORDER_FULFILMENT_UPDATED');return{statusx:'SUCCESS_MESSAGE',message:'Order update sent to the business.'};
  }
  if(requested==='tracking-number-update'){
   const trackingNumber=String(form.get('trackingNumber')||'').trim(),trackingCompany=String(form.get('trackingCompany')||'').trim(),trackingLink=String(form.get('trackingLink')||'').trim();
   if(!trackingNumber||!trackingCompany||trackingNumber.length>191||trackingCompany.length>191)throw new AdjustmentError('Enter a valid carrier and tracking number.',422);
   if(trackingLink&&!/^https:\/\//.test(trackingLink))throw new AdjustmentError('Use an HTTPS tracking link.',422);
   await db.orders.update({where:{pidOrder},data:{trackingNumber,trackingCompany,trackingLink,updatedAt:new Date()}});
   await adjustmentEvent(db,order,actor,'ORDER_FULFILMENT_UPDATED');return{statusx:'SUCCESS',message:'Tracking details updated.'};
  }
  if(!transitions[operational.status]?.includes(requested))throw new AdjustmentError('This status change is not available. Refresh the order.',422);
  let next=requested==='revert_to_approved'?'approved':requested;
  if(!['on-hold','revert_to_approved'].includes(requested)&&order.paymentStatus!=='PAID')throw new AdjustmentError('Resolve the payment review before progressing this order.');
  const [last]=await db.$queryRaw<AdjustmentRow[]>`SELECT * FROM partner_order_adjustments WHERE orderId=${order.id} ORDER BY revision DESC LIMIT 1`;
  const [settled]=await db.$queryRaw<AdjustmentRow[]>`SELECT * FROM partner_order_adjustments WHERE orderId=${order.id} AND status='SETTLED' ORDER BY revision DESC LIMIT 1`;
  const cost=settled?JSON.parse(settled.afterJson):originalCheckout(order).cost;
  if(requested==='pay-for-shipping'){
   const quantity=Number(form.get('actualWeight')),domestic=Number(form.get('actualDomesticShippingCost'));
   if(!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(domestic)||domestic<0)throw new AdjustmentError('Enter the final weight or volume and domestic shipping cost.',422);
   const snapshot=cost.shipping;const rate=Number(snapshot?.rate),fx=cost.currency==='NGN'?Number(cost.config.ngnPerUsd):Number(cost.config.gbpPerUsd);
   if(!['USD','NGN'].includes(snapshot?.rateCurrency)||!Number.isFinite(rate)||rate<0||!Number.isFinite(fx)||fx<=0)throw new AdjustmentError('The original shipping price needs review.');
   const shippingUsd=quantity*rate/(snapshot.rateCurrency==='NGN'?Number(cost.config.ngnPerUsd):1)+domestic;
   const shippingMinor=Math.round(shippingUsd*fx*100);
   if(shippingMinor!==cost.shippingMinor){await proposeAdjustmentInTransaction(db,order.id,actor,{revision:last?.revision||0,productCostMinor:cost.productCostMinor,shippingMinor,reason:String(form.get('message')||'').trim()||'Shipping updated using the final warehouse weight or volume and domestic delivery cost.'});}
   else{await assertOrderFinanciallyClear(db,order.id);next='in-transit';}
   await db.orders.update({where:{pidOrder},data:{orderWeight:String(quantity),shippingCost1:String(domestic)}});
  }else if(!['on-hold','revert_to_approved'].includes(requested))await assertOrderFinanciallyClear(db,order.id);
  if(requested==='cancelled'&&cost.orderTotalMinor!==0)throw new AdjustmentError('Complete the approved refund through Order adjustments before cancelling this paid order.');
  await db.orders.update({where:{pidOrder},data:{status:next,updatedAt:new Date()}});
  await adjustmentEvent(db,order,actor,'ORDER_FULFILMENT_UPDATED');
  return{statusx:'SUCCESS',message:next==='pay-for-shipping'?'Revised shipping costs sent to the business for approval. The customer will see the change after approval.':'Order status updated.'};
 });
}
