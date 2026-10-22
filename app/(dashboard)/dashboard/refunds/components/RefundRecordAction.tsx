'use client';
import { useState } from 'react';
import { toast } from 'sonner';

type Refund = {pidRefund:string;amount:string|null;currency:string|null;customer?:{userFirstname:string|null;userLastname:string|null;bank_name:string|null;bank_account_name:string|null;bank_account_number:string|null}|null};
export default function RefundRecordAction({refund,mode,onDone,onCancel}:{refund:Refund;mode:'payment'|'archive';onDone:()=>void;onCancel?:()=>void}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;const form=new FormData(event.currentTarget);setBusy(true);setError('');
  try {
   const response=await fetch(`/api/refunds/${encodeURIComponent(refund.pidRefund)}/mark-paid`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode==='archive'?'ARCHIVE_TEST':'RECORD_LEGACY_PAYMENT',confirmed:form.get('confirmed')==='on',reason:form.get('reason'),reference:form.get('reference'),confirmedAmount:form.get('amount'),confirmedCurrency:refund.currency,recipient:form.get('recipient')})});
   const data=await response.json();if(!response.ok)throw new Error(data.message||'Unable to save this change.');toast.success(data.message);onDone();
  }catch(e){setError(e instanceof Error?e.message:'Unable to save. Refresh before trying again.')}finally{setBusy(false)}
 }
 const field='w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm';
 return <form onSubmit={submit} className="space-y-4">
  <h3 className="text-base font-semibold">{mode==='archive'?'Clear unpaid test refund':'Record completed bank payment'}</h3>
  <p className="break-all text-sm text-muted-foreground">{refund.pidRefund} · {refund.currency} {refund.amount}</p>
  <p className="text-sm text-muted-foreground">{mode==='archive'?'This removes the test record from the active list and keeps its audit history. No payments or wallet balances will be changed.':'Use this only for a bank transfer already completed outside the app. This records the payment; it does not transfer money.'}</p>
  {mode==='payment'&&<>
   <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm">Amount paid ({refund.currency})<input className={field} name="amount" inputMode="decimal" required pattern="[0-9]+([.][0-9]{1,2})?" /></label><label className="grid gap-2 text-sm">Bank transaction reference<input className={field} name="reference" required minLength={6} maxLength={191} /></label></div>
   <label className="grid gap-2 text-sm">Recipient and bank account paid<textarea className={field} name="recipient" required minLength={5} maxLength={500} defaultValue={[refund.customer?.bank_account_name,refund.customer?.bank_name,refund.customer?.bank_account_number].filter(Boolean).join(' · ')} /></label>
  </>}
  <label className="grid gap-2 text-sm">{mode==='archive'?'Why is this a test refund?':'Payment evidence / notes'}<textarea className={field} name="reason" required minLength={10} maxLength={1000} /></label>
  <label className="flex items-start gap-3 text-sm"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" name="confirmed" required /><span>{mode==='archive'?'I confirm this is a test record and no money has been paid or credited to a wallet.':'I verified the recipient, confirmed this transfer completed and checked that this refund has not already been paid.'}</span></label>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  <div className="flex flex-col gap-3 sm:flex-row"><button disabled={busy} className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy?'Saving…':mode==='archive'?'Archive test refund':'Mark refund as paid'}</button>{onCancel&&<button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>}</div>
 </form>;
}
