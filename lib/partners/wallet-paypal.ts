import 'server-only';
// Withdrawals use the configured live Sure Imports app, never historical LineScout credentials.
async function getPayPalAccessToken() {
 const id=process.env.SUREIMPORTS_PAYPAL_CLIENT_ID,secret=process.env.SUREIMPORTS_PAYPAL_SECRET;
 if(!id||!secret)throw new Error('GBP payouts are temporarily unavailable. Please contact support.');
 const response=await fetch('https://api-m.paypal.com/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',cache:'no-store',signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 if(!response.ok||!result.access_token)throw new Error('GBP payouts are temporarily unavailable. Please contact support.');
 return String(result.access_token);
}
export type GbpPayout = { id:string; amountMinor:bigint; receiver:string };
function money(value:bigint){return (value/BigInt(100)).toString()+'.'+(value%BigInt(100)).toString().padStart(2,'0');}
async function request(path:string,body?:unknown,id?:string) {
 const response=await fetch('https://api-m.paypal.com/v1/payments/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+await getPayPalAccessToken(),'Content-Type':'application/json',...(id?{'PayPal-Request-Id':id}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 if(!response.ok){
  const duplicate=result.name==='DUPLICATE_BATCH_ID'||result.details?.some((d:{issue?:string})=>d.issue==='DUPLICATE_BATCH_ID');
  if(body&&duplicate){const link=result.links?.find((l:{href?:string;method?:string})=>l.method==='GET'&&/^https:\/\/api-m.paypal.com\/v1\/payments\/payouts\/[A-Z0-9]+$/.test(l.href||''));if(link)return {batch_header:{payout_batch_id:link.href.split('/').pop()}};}
  throw new Error('PayPal has not confirmed this payout. Keep the existing withdrawal for reconciliation.');
 }return result;
}
export async function createGbpPayout(row:GbpPayout){
 if(!/^pww_[a-f0-9-]{36}$/.test(row.id)||row.amountMinor<=BigInt(0)||row.amountMinor>BigInt(Number.MAX_SAFE_INTEGER)||!/^\S+@\S+\.\S+$/.test(row.receiver))throw new Error('Invalid payout instructions.');
 const result=await request('payouts',{sender_batch_header:{sender_batch_id:row.id,email_subject:'Your Sure Imports partner earnings'},items:[{recipient_type:'EMAIL',receiver:row.receiver,amount:{currency:'GBP',value:money(row.amountMinor)},sender_item_id:row.id,note:'Sure Imports partner earnings'}]},row.id);
 const id=result.batch_header?.payout_batch_id;if(typeof id!=='string'||!/^[A-Z0-9]+$/.test(id))throw new Error('Payout confirmation is pending.');return id;
}
export async function verifyGbpPayout(batchId:string,row:GbpPayout){
 if(!/^[A-Z0-9]+$/.test(batchId))throw new Error('Invalid payout reference.');
 const result=await request('payouts/'+batchId+'?page_size=1000&total_required=true');
 if(result.batch_header?.payout_batch_id!==batchId||result.batch_header?.sender_batch_header?.sender_batch_id!==row.id||!Array.isArray(result.items)||result.items.length!==1||(result.total_items!==undefined&&result.total_items!==1))throw new Error('Payout details need reconciliation.');
 const item=result.items[0],payout=item.payout_item;
 if(payout?.sender_item_id!==row.id||payout.recipient_type!=='EMAIL'||payout.receiver?.toLowerCase()!==row.receiver.toLowerCase()||payout.amount?.currency!=='GBP'||payout.amount?.value!==money(row.amountMinor))throw new Error('Payout details do not match the withdrawal.');
 const state=String(item.transaction_status);
 if(state==='SUCCESS')return 'PAID';
 if(['RETURNED','REFUNDED','REVERSED'].includes(state))return 'REVERSED';
 if(['FAILED','DENIED'].includes(state))return 'FAILED';
 return 'PROCESSING';
}
