'use client';
import { useCallback,useEffect,useState } from 'react';
import { RefreshCw } from 'lucide-react';
import styles from './OrderAdjustmentPanel.module.css';
type Cost={productCostMinor:number;shippingMinor:number;serviceChargeMinor:number;taxMinor:number;orderTotalMinor:number};
type Change={id:string;revision:number;status:string;currency:string;deltaMinor:string;reason:string;reviewNote:string|null;before:Cost;after:Cost};
type Refund={id:string;adjustmentId:string;provider:string;currency:string;amountMinor:string;status:string;providerReference:string|null;attemptedAt:string|null};
type Data={isPartner?:boolean;adjustments:Change[];cost?:{currency:string;productCostMinor:number;shippingMinor:number};refunds?:Refund[]};
const labels:Record<string,string>={AWAITING_PARTNER:'Awaiting business review',AWAITING_PAYMENT:'Additional payment required',REFUND_REQUIRED:'Refund approved',REFUND_PROCESSING:'Refund in progress',SETTLED:'Completed',REJECTED:'Declined'};
const money=(minor:number|string,currency:string)=>new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(Number(minor)/100);
const fields:[keyof Cost,string][]=[['productCostMinor','Products'],['shippingMinor','Shipping'],['serviceChargeMinor','Service charge'],['taxMinor','VAT'],['orderTotalMinor','Order total']];
function toMinor(value:string){if(!/^\d+(\.\d{1,2})?$/.test(value))throw Error('Enter amounts with no more than two decimal places.');const [whole,fraction='']=value.split('.');const n=Number(whole)*100+Number(fraction.padEnd(2,'0'));if(!Number.isSafeInteger(n))throw Error('Check the entered amount.');return n;}
export default function OrderAdjustmentPanel({endpoint,role,onUpdated}:{endpoint:string;role:'admin'|'partner'|'customer';onUpdated?:()=>void}){
 const [data,setData]=useState<Data|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [notice,setNotice]=useState<{error:boolean;text:string}|null>(null);
 const [product,setProduct]=useState(''),[shipping,setShipping]=useState(''),[reason,setReason]=useState('');
 const [notes,setNotes]=useState<Record<string,string>>({}),[confirmed,setConfirmed]=useState<Record<string,boolean>>({}),[references,setReferences]=useState<Record<string,string>>({});
 const load=useCallback(async(signal?:AbortSignal)=>{
  const response=await fetch(endpoint,{cache:'no-store',signal});const body=await response.json();
  if(!response.ok)throw Error(body.message||'Unable to load order changes.');
  setData(body);if(body.cost){setProduct((body.cost.productCostMinor/100).toFixed(2));setShipping((body.cost.shippingMinor/100).toFixed(2));}
 },[endpoint]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setData(null);setNotice(null);load(controller.signal).catch(e=>{if(!controller.signal.aborted)setNotice({error:true,text:e instanceof Error?e.message:'Unable to load order changes.'});}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[load]);
 async function perform(body:Record<string,unknown>,success:string){
  setBusy(true);setNotice(null);
  try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw Error(result.message||'The change could not be completed. Check its status before retrying.');
   if(result.url){const url=new URL(result.url,window.location.origin);if(url.protocol!=='https:'&&url.origin!==window.location.origin)throw Error('Unable to open checkout. Refresh and try again.');window.location.assign(url.href);return;}
   await load();setConfirmed({});setNotice({error:false,text:result.message||success});onUpdated?.();
  }catch(e){setNotice({error:true,text:e instanceof Error?e.message:'Connection interrupted. Check the order status before trying again.'});}finally{setBusy(false);}
 }
 const refresh=async()=>{setBusy(true);try{await load();setNotice(null);}catch{setNotice({error:true,text:'Unable to refresh order changes. Try again shortly.'});}finally{setBusy(false);}};
 if(data?.isPartner===false)return null;
 const changes=data?.adjustments||[];const active=changes.some(row=>!['SETTLED','REJECTED'].includes(row.status));
 return <section className={styles.panel} aria-label="Order adjustments" aria-busy={busy||loading}>
  <header className={styles.header}><div><h3>Order adjustments</h3><p>{role==='admin'?'Propose revised costs for business approval. Payments and refunds stay with this order.':role==='partner'?'Review changes before your customer is asked to pay or receives a refund.':'See changes to your order and any additional payment or refund.'}</p></div><button type="button" onClick={refresh} disabled={busy||loading} className={styles.secondary}><RefreshCw size={16} aria-hidden="true" />Refresh</button></header>
  {notice&&<p className={notice.error?styles.error:styles.success} role={notice.error?'alert':'status'}>{notice.text}</p>}
  {loading?<p role="status">Loading order changes…</p>:data&&<>
   {!changes.length&&<p className={styles.empty}>There are no price adjustments on this order.</p>}
   {changes.map(row=><article key={row.id} className={styles.change}>
    <div className={styles.summary}><strong>Change {row.revision}</strong><span>{labels[row.status]||'Under review'}</span><strong>{Number(row.deltaMinor)<0?'Refund: ':Number(row.deltaMinor)>0?'Additional payment: ':'No payment change: '}{money(Math.abs(Number(row.deltaMinor)),row.currency)}</strong></div>
    <p className={styles.reason}>{row.reason}</p>
    <div className={styles.tableWrap}><table><caption>Price comparison ({row.currency})</caption><thead><tr><th>Item</th><th>Before</th><th>Revised</th></tr></thead><tbody>{fields.map(([key,label])=><tr key={key}><th>{label}</th><td>{money(row.before[key],row.currency)}</td><td>{money(row.after[key],row.currency)}</td></tr>)}</tbody></table></div>
    {row.reviewNote&&<p>Review note: {row.reviewNote}</p>}
    {role==='partner'&&row.status==='AWAITING_PARTNER'&&<div className={styles.actionsBlock}>
     <label>Review note<textarea value={notes[row.id]||''} maxLength={2000} onChange={e=>setNotes(s=>({...s,[row.id]:e.target.value}))} placeholder="Required if you decline this change (at least 10 characters)" /></label>
     <label className={styles.check}><input type="checkbox" checked={confirmed[row.id]||false} onChange={e=>setConfirmed(s=>({...s,[row.id]:e.target.checked}))} />I have checked these revised costs and approve the additional payment or refund.</label>
     <div className={styles.actions}><button type="button" disabled={busy||!confirmed[row.id]} onClick={()=>perform({action:'REVIEW',adjustmentId:row.id,revision:row.revision,approve:true,note:notes[row.id]||''},'Order change approved.')} className={styles.primary}>Approve change</button><button type="button" disabled={busy||(notes[row.id]||'').trim().length<10} onClick={()=>perform({action:'REVIEW',adjustmentId:row.id,revision:row.revision,approve:false,note:notes[row.id]||''},'Order change declined.')} className={styles.secondary}>Decline change</button></div>
    </div>}
    {role==='customer'&&row.status==='AWAITING_PAYMENT'&&<div className={styles.actionsBlock}>
     <label className={styles.check}><input type="checkbox" checked={confirmed[row.id]||false} onChange={e=>setConfirmed(s=>({...s,[row.id]:e.target.checked}))} />I agree to the additional payment of {money(row.deltaMinor,row.currency)}.</label>
     <div className={styles.actions}>{row.currency==='NGN'&&<button type="button" className={styles.primary} disabled={busy||!confirmed[row.id]} onClick={()=>perform({action:'CHECKOUT',adjustmentId:row.id,provider:'PAYSTACK',confirmed:true},'Checkout opened.')}>Pay with Paystack</button>}<button type="button" className={styles.secondary} disabled={busy||!confirmed[row.id]} onClick={()=>perform({action:'CHECKOUT',adjustmentId:row.id,provider:'PAYPAL',confirmed:true},'Checkout opened.')}>Pay by card or PayPal</button><button type="button" className={styles.secondary} disabled={busy} onClick={()=>perform({action:'VERIFY',adjustmentId:row.id},'Payment status checked.')}>Check payment status</button></div>
     {row.currency==='NGN'&&<p>Card or PayPal checkout uses the order’s locked USD exchange rate. Review the USD amount before authorizing payment.</p>}
    </div>}
    {role==='customer'&&['REFUND_REQUIRED','REFUND_PROCESSING'].includes(row.status)&&<p>Your refund will return to the original payment method. You do not need to make another payment. Contact your business for help.</p>}
    {role==='admin'&&['REFUND_REQUIRED','REFUND_PROCESSING'].includes(row.status)&&<div className={styles.actionsBlock}>
     {row.status==='REFUND_REQUIRED'?<><label className={styles.check}><input type="checkbox" checked={confirmed[row.id]||false} onChange={e=>setConfirmed(s=>({...s,[row.id]:e.target.checked}))} />Return this approved reduction to the original payment method.</label><button type="button" className={styles.primary} disabled={busy||!confirmed[row.id]} onClick={()=>perform({action:'REFUND',adjustmentId:row.id,confirmed:true},'Refund processing checked.')}>Issue approved refund</button></>:<button type="button" className={styles.secondary} disabled={busy} onClick={()=>perform({action:'CHECK_REFUND',adjustmentId:row.id},'Refund status checked.')}>Check refund status</button>}
     <details className={styles.actionsBlock}><summary>Already refunded outside this dashboard?</summary><p>Record the completed provider refund against this approved reduction. This will not send another refund.</p><label>PayPal or Paystack refund reference<input value={references[row.id]||''} onChange={e=>setReferences(s=>({...s,[row.id]:e.target.value}))} /></label><div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy||!references[row.id]?.trim()} onClick={()=>perform({action:'LINK_EXTERNAL_REFUND',adjustmentId:row.id,provider:'PAYPAL',reference:references[row.id],confirmed:true},'Existing PayPal refund recorded.')}>Verify existing PayPal refund</button><button type="button" className={styles.secondary} disabled={busy||!references[row.id]?.trim()} onClick={()=>perform({action:'LINK_EXTERNAL_REFUND',adjustmentId:row.id,provider:'PAYSTACK',reference:references[row.id],confirmed:true},'Existing Paystack refund recorded.')}>Verify existing Paystack refund</button></div></details>
     {(data.refunds||[]).filter(r=>r.adjustmentId===row.id).map(part=><div className={styles.refund} key={part.id}><p>{part.provider} · {money(part.amountMinor,part.currency)} · {part.status==='SUPERSEDED'?'Replaced after confirmed failure':part.status==='FAILED'?'Failed — review retry':part.status==='SETTLED'?'Completed':'Awaiting confirmation'}{part.providerReference?' · '+part.providerReference:''}</p>{part.status==='FAILED'&&part.providerReference&&<button type="button" className={styles.secondary} disabled={busy} onClick={()=>perform({action:'PREPARE_REFUND_RETRY',adjustmentId:row.id,partId:part.id},'Failed refund verified. Approve the replacement to send it.')}>Verify failure and prepare retry</button>}{part.attemptedAt&&!part.providerReference&&<><label>Existing provider refund reference<input value={references[part.id]||''} onChange={e=>setReferences(s=>({...s,[part.id]:e.target.value}))} /></label><button type="button" className={styles.secondary} disabled={busy||!references[part.id]?.trim()} onClick={()=>perform({action:'CHECK_REFUND',adjustmentId:row.id,partId:part.id,reference:references[part.id]},'Existing refund checked.')}>Recover existing refund</button><p>This checks money already returned; it does not send another refund.</p></>}</div>)}
    </div>}
   </article>)}
   {role==='admin'&&data.cost&&!active&&<form className={styles.actionsBlock} onSubmit={event=>{event.preventDefault();try{void perform({action:'PROPOSE',revision:changes[0]?.revision||0,productCostMinor:toMinor(product),shippingMinor:toMinor(shipping),reason},'Revised costs sent to the business for approval.');}catch(e){setNotice({error:true,text:e instanceof Error?e.message:'Check the amounts.'});}}}>
    <h4>Propose revised costs</h4><div className={styles.fields}><label>Product total ({data.cost.currency})<input inputMode="decimal" required value={product} onChange={e=>setProduct(e.target.value)} /></label><label>Shipping total ({data.cost.currency})<input inputMode="decimal" required value={shipping} onChange={e=>setShipping(e.target.value)} /></label></div>
    <label>Reason shown to the business and customer<textarea required minLength={10} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain the price change clearly. Do not include private supplier or internal information." /></label><p>Service charge, VAT and product earnings are recalculated using the original agreed rates. Shipping does not earn commission.</p><button type="submit" className={styles.primary} disabled={busy||reason.trim().length<10}>Send for business approval</button>
   </form>}
  </>}
 </section>;
}
