'use client';
import { useEffect, useState, type FormEvent } from 'react';
type Price = { planKey: string; monthly: string; credit: string; revision: number };
export default function UsdPricingSettings() {
  const [prices,setPrices] = useState<Price[]>([]);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  async function load() {
    const response = await fetch('/api/intelligence/usd-pricing', { cache:'no-store' });
    const data = await response.json();
    if (!response.ok) throw Error(data.message || 'Unable to load USD pricing.');
    setPrices(data.prices.map((row: any) => ({planKey:row.planKey,monthly:(row.priceUsdCents/100).toFixed(2),credit:(row.extraCreditPriceUsdCents/100).toFixed(2),revision:row.revision})));
  }
  useEffect(() => { void load().catch(error=>setMessage(error.message)); },[]);
  async function save(event:FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/intelligence/usd-pricing', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({prices:prices.map(row=>({planKey:row.planKey,priceUsdCents:Math.round(Number(row.monthly)*100),extraCreditPriceUsdCents:Math.round(Number(row.credit)*100),revision:row.revision}))})});
      const data = await response.json(); if(!response.ok) throw Error(data.message || 'Unable to save USD prices.');
      await load(); setMessage('USD pricing saved. Existing PayPal subscriptions retain their agreed price.');
    } catch(error) {setMessage((error as Error).message);} finally {setBusy(false);}
  }
  return <section className="max-w-5xl rounded-xl border border-border bg-card p-6"><h2 className="text-lg font-semibold">International pricing · USD / PayPal</h2><p className="mt-2 text-sm text-muted-foreground">Monthly subscriptions renew automatically through PayPal. Extra credits are one-time purchases. Set 0 to disable new purchases. Price changes apply to new subscriptions; existing subscribers keep their agreed rate.</p><form onSubmit={save} className="mt-6 space-y-5">{prices.map(row=><fieldset key={row.planKey} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2"><legend className="px-2 font-semibold capitalize">{row.planKey}</legend>{(['monthly','credit'] as const).map(field=><label key={field} className="grid gap-2 text-sm">{field==='monthly'?'Monthly price (USD)':'Extra search credit (USD)'}<input type="number" min="0" max="100000" step="0.01" required disabled={busy} value={row[field]} onChange={event=>setPrices(current=>current.map(item=>item.planKey===row.planKey?{...item,[field]:event.target.value}:item))} className="min-h-12 rounded-md border border-input bg-background px-3" /></label>)}</fieldset>)}<button disabled={busy || prices.length!==2} className="min-h-12 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy?'Saving…':'Save USD pricing'}</button><button type="button" disabled={busy} onClick={()=>void load().catch(error=>setMessage(error.message))} className="ml-3 min-h-12 rounded-lg border px-5 py-3">Reload</button>{message&&<p role="status" className="text-sm">{message}</p>}</form></section>;
}
