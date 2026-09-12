'use client';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { percentageToBps } from '@/lib/partners/commercial-terms-policy';
type Terms = { serviceChargeBps: number; partnerShareBps: number; pricingRevision: number; status: string; liveCollectionEnabled: boolean };
const field = 'mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 py-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
export default function CommercialTerms({ partnerId, onSaved }: { partnerId: string; onSaved: () => void }) {
  const [terms, setTerms] = useState<Terms | null>(null);
  const [service, setService] = useState(''); const [share, setShare] = useState('');
  const [reason, setReason] = useState(''); const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError('');
    fetch(`/api/partners/review/${encodeURIComponent(partnerId)}/commercial-terms`, { cache: 'no-store', signal: abort.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Could not load terms.'); return data; }).then(data => { setTerms(data); setService(String(data.serviceChargeBps / 100)); setShare(String(data.partnerShareBps / 100)); setConfirmed(false); }).catch(err => { if (!abort.signal.aborted) setError(err.message); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [partnerId, attempt]);
  const serviceBps = percentageToBps(service), shareBps = percentageToBps(share);
  const valid = serviceBps !== null && shareBps !== null && shareBps <= serviceBps;
  const retained = valid ? (serviceBps - shareBps) / 100 : null;
  const changed = terms && (serviceBps !== terms.serviceChargeBps || shareBps !== terms.partnerShareBps);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!terms || !valid || !confirmed || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/partners/review/${encodeURIComponent(partnerId)}/commercial-terms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pricingRevision: terms.pricingRevision, serviceChargeBps: serviceBps, partnerShareBps: shareBps, reason, confirmed }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Could not save terms.');
      setNotice(data.message); setReason(''); setConfirmed(false); setAttempt(v => v + 1); onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save terms.'); } finally { setBusy(false); }
  }
  return <section className="my-6 rounded-xl border border-border bg-background p-5" aria-labelledby="commercial-terms-heading">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h3 id="commercial-terms-heading" className="text-lg font-semibold">Commercial terms</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Set this partner’s share. All percentages are of product cost, not the total order or service charge.</p></div><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium" disabled={busy || loading} onClick={() => setAttempt(v => v + 1)}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh</button></header>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}{notice && <p role="status" className="mt-4 text-sm">{notice}</p>}
    {loading ? <p role="status" className="mt-4 text-sm text-muted-foreground">Loading commercial terms…</p> : terms && <form onSubmit={save} className="mt-5 space-y-5"><fieldset disabled={busy || !['PENDING','ACTIVE'].includes(terms.status)} className="space-y-5 disabled:opacity-60">
      <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Customer service charge (%)<input className={field} inputMode="decimal" value={service} onChange={e => { setService(e.target.value); setConfirmed(false); }} required /></label><label className="text-sm font-medium">Partner earns (%)<input className={field} inputMode="decimal" value={share} onChange={e => { setShare(e.target.value); setConfirmed(false); }} required /></label><div className="text-sm font-medium">Sure Imports retains (%)<output className="mt-2 flex min-h-12 items-center rounded-lg border border-border bg-muted px-3 py-3 text-base font-semibold">{retained === null ? '—' : retained.toFixed(2)}</output></div></div>
      {!valid && <p className="text-sm text-destructive">Enter percentages from 0 to 100 with up to two decimal places. Partner earnings cannot exceed the service charge.</p>}
      {valid && <p className="rounded-lg bg-muted p-4 text-sm leading-6">On ₦100,000 of products: customer service charge ₦{(serviceBps * 10).toLocaleString('en-NG')}; partner earns ₦{(shareBps * 10).toLocaleString('en-NG')}; Sure Imports retains ₦{((serviceBps - shareBps) * 10).toLocaleString('en-NG')}. Shipping is excluded.</p>}
      <label className="block text-sm font-medium">Reason for change<textarea className={field} value={reason} onChange={e => setReason(e.target.value)} minLength={5} maxLength={1000} required rows={2} /></label>
      <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1 h-4 w-4 shrink-0 accent-primary" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required /><span>I understand that the partner must accept the revised agreement. New checkouts pause until acceptance; existing payment and earnings records are unchanged.</span></label>
      <div className="flex flex-wrap items-center justify-between gap-4"><span className="text-sm text-muted-foreground">Pricing revision {terms.pricingRevision}</span><button className="min-h-11 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={busy || !changed || !valid || !confirmed || reason.trim().length < 5}>{busy ? 'Saving…' : 'Save commercial terms'}</button></div>
    </fieldset></form>}
  </section>;
}
