import 'server-only';
import { AdjustmentError } from './adjustments';
export async function adjustmentPaystack(path:string,body?:unknown){
 const key=process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY||process.env.PAYSTACK_SECRET_KEY||'';
 if(!key.startsWith('sk_live_'))throw new AdjustmentError('Payment processing is temporarily unavailable. Please try again shortly.',503);
 const response=await fetch('https://api.paystack.co'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
 const data=await response.json();if(!response.ok||data.status!==true||!data.data)throw new AdjustmentError('Payment confirmation is unavailable. Check your order status before retrying.',503);return data.data;
}

