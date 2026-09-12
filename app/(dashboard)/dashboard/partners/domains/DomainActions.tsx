'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function DomainActions({id,suspended}:{id:string;suspended:boolean}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const router=useRouter();
  async function act(action:string) {
    const reason=window.prompt(action==='suspend'?'Reason for suspending this storefront domain:':'Reason for resetting verification. The partner must complete all checks again:');
    if(!reason)return;if(reason.trim().length<10){setMessage('Provide a reason of at least 10 characters.');return;}
    setBusy(true);setMessage('');try{const r=await fetch(`/api/partners/domains/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,reason})});const d=await r.json();if(!r.ok)throw new Error(d.message);router.refresh();}catch(e){setMessage(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}
  }
  return <div className="space-y-2"><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>act('reset')} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">{suspended?'Release for verification':'Reset verification'}</button>{!suspended&&<button disabled={busy} onClick={()=>act('suspend')} className="rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive">Suspend</button>}</div>{message&&<p role="alert" className="text-sm text-destructive">{message}</p>}</div>;
}
