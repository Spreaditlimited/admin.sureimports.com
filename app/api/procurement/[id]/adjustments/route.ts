import { linkExistingAdjustmentRefund } from '@/lib/partners/external-refund-review';
import { NextRequest,NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { orderAdjustments,proposeAdjustment,adjustmentOrder,originalCheckout,AdjustmentError } from '@/lib/partners/adjustments';
import { processAdjustmentRefund,prepareAdjustmentRefundRetry } from '@/lib/partners/adjustment-refunds';
export const dynamic='force-dynamic';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const failure=(e:unknown)=>response({message:e instanceof AdjustmentError?e.message:'The order change could not be completed. Refresh its status; do not submit another payment or refund.'},e instanceof AdjustmentError?e.status:503);
async function customerOrderId(id:string){const [row]=await prisma.$queryRaw<Array<{id:string}>>`SELECT id FROM procurement_partner_customer_orders WHERE releasedOrderId=${id} LIMIT 1`;return row?.id;}
export async function GET(_request:NextRequest,context:Context){
 const access=await requireAdminServiceAccess('procurement','view');if(!access.ok)return access.response;
 try{const id=await customerOrderId((await context.params).id);if(!id)return response({isPartner:false});
 const order=await adjustmentOrder(prisma,id,false);const rows=await orderAdjustments(id,{kind:'admin',pid:access.admin.pidUser});
 const [latest]=await prisma.$queryRaw<Array<{afterJson:string}>>`SELECT afterJson FROM partner_order_adjustments WHERE orderId=${id} AND status='SETTLED' ORDER BY revision DESC LIMIT 1`;
 const cost=latest?JSON.parse(latest.afterJson):originalCheckout(order).cost;
 const refunds=await prisma.$queryRaw<Array<{id:string;adjustmentId:string;provider:string;currency:string;amountMinor:bigint;status:string;providerReference:string|null;attemptedAt:Date|null}>>`SELECT r.id,r.adjustmentId,r.provider,r.currency,r.amountMinor,r.status,r.providerReference,r.attemptedAt FROM partner_adjustment_refunds r JOIN partner_order_adjustments a ON a.id=r.adjustmentId WHERE a.orderId=${id}`;
 return response({isPartner:true,adjustments:rows,cost:{currency:cost.currency,productCostMinor:cost.productCostMinor,shippingMinor:cost.shippingMinor},refunds:refunds.map(r=>({...r,amountMinor:String(r.amountMinor)}))});
 }catch(e){return failure(e);}
}
export async function POST(request:NextRequest,context:Context){
 const access=await requireAdminServiceAccess('procurement','edit');if(!access.ok)return access.response;
 if(request.headers.get('origin')!==request.nextUrl.origin||request.headers.get('sec-fetch-site')==='cross-site')return response({message:'Refresh your dashboard and try again.'},403);
 try{const text=await request.text();if(text.length>5000)return response({message:'Request too large.'},413);let body;try{body=JSON.parse(text);}catch{return response({message:'Check the request details.'},422);}
 const id=await customerOrderId((await context.params).id);if(!id)throw new AdjustmentError('Partner order not found.',404);
 if(body.action==='PROPOSE')return response(await proposeAdjustment(id,access.admin.pidUser,body));
 if(!['REFUND','CHECK_REFUND','PREPARE_REFUND_RETRY','LINK_EXTERNAL_REFUND'].includes(body.action))throw new AdjustmentError('Choose a valid adjustment action.',422);
 const refundAccess=await requireAdminServiceAccess('refunds','edit');if(!refundAccess.ok)return refundAccess.response;
 const rows=await orderAdjustments(id,{kind:'admin',pid:access.admin.pidUser});if(!rows.some(r=>r.id===body.adjustmentId))throw new AdjustmentError('Adjustment not found.',404);
 if(body.action==='LINK_EXTERNAL_REFUND'){if(body.confirmed!==true)throw new AdjustmentError('Confirm recording the existing refund.',422);return response(await linkExistingAdjustmentRefund(body.adjustmentId,String(body.provider||''),String(body.reference||'').trim(),access.admin.pidUser));}
 if(body.action==='PREPARE_REFUND_RETRY')return response(await prepareAdjustmentRefundRetry(body.adjustmentId,String(body.partId||''),access.admin.pidUser));
 if(body.action==='REFUND'&&body.confirmed!==true)throw new AdjustmentError('Confirm returning this amount to the original payment method.',422);
 return response(await processAdjustmentRefund(body.adjustmentId,body.action==='REFUND',body.reference?{partId:String(body.partId||''),reference:String(body.reference).trim()}:undefined));
 }catch(e){return failure(e);}
}
