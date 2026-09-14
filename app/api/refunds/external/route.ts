import { classifyExternalPayPalRefund } from '@/lib/refunds/external-classification';
import { NextRequest,NextResponse } from 'next/server';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { closeUnpaidExternalPayPalRefund } from '@/lib/refunds/external-paypal';
export async function POST(request:NextRequest){
 const access=await requireAdminServiceAccess('refunds','edit');if(!access.ok)return access.response;
 if(request.headers.get('origin')!==request.nextUrl.origin||request.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({message:'Refresh your dashboard and try again.'},{status:403});
 try{const text=await request.text();if(text.length>5000)return NextResponse.json({message:'Request too large.'},{status:413});const body=JSON.parse(text);if(body.action==='CLASSIFY')return NextResponse.json(await classifyExternalPayPalRefund(String(body.providerReference||''),access.admin.pidUser,{remainingEligiblePercent:String(body.remainingEligiblePercent||''),reason:String(body.reason||''),confirmed:body.confirmed===true}));if(body.action!=='CHECK_NOT_PAID')return NextResponse.json({message:'Choose a valid review action.'},{status:422});return NextResponse.json(await closeUnpaidExternalPayPalRefund(String(body.providerReference||''),access.admin.pidUser));}catch(e){return NextResponse.json({message:e instanceof Error&&/^(PayPal has not|The provider result|This refund|This order|The original|The remaining|Confirm the refund|Refund review|Enter a valid)/.test(e.message)?e.message:'Unable to confirm this refund review. No review was closed; try again shortly.'},{status:409});}
}
