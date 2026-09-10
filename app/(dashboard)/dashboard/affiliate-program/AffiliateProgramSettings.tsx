'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, ChevronUp, Plus, RefreshCw, ShieldCheck } from 'lucide-react';

type Rate = { currency: string; fixedAmount: number | null; active: boolean };
export type ProgramService = {
  pidService: string; serviceKey: string; displayName: string; description: string | null;
  commissionType: string; percentageRate: number | null; eligibleAmountBasis: string;
  recurring: boolean; approvalMode: string; reviewPeriodDays: number;
  exclusionNotes: string | null; active: boolean; sortOrder: number;
  conversionCount: number; updatedAt: string; rates: Rate[];
};

const money = (amount: number, currency: string) => new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
const rateFor = (service: ProgramService | undefined, currency: string) => service?.rates.find((rate) => rate.currency === currency);
const field = 'h-11 rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

function ServiceEditor({ service, onDone }: { service?: ProgramService; onDone: () => void }) {
  const router = useRouter();
  const [commissionType, setCommissionType] = useState(service?.commissionType || 'FIXED');
  const [active, setActive] = useState(service?.active ?? true);
  const [recurring, setRecurring] = useState(service?.recurring ?? false);
  const [approvalMode, setApprovalMode] = useState(service?.approvalMode || 'MANUAL');
  const [ngnActive, setNgnActive] = useState(rateFor(service, 'NGN')?.active ?? true);
  const [usdActive, setUsdActive] = useState(rateFor(service, 'USD')?.active ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const payload = {
      serviceKey: form.get('serviceKey'), displayName: form.get('displayName'), description: form.get('description'),
      commissionType, percentageRate: form.get('percentageRate'), eligibleAmountBasis: form.get('eligibleAmountBasis'),
      recurring, approvalMode, reviewPeriodDays: form.get('reviewPeriodDays'),
      exclusionNotes: form.get('exclusionNotes'), active, sortOrder: form.get('sortOrder'),
      rates: [{ currency: 'NGN', fixedAmount: form.get('ngnAmount'), active: ngnActive }, { currency: 'USD', fixedAmount: form.get('usdAmount'), active: usdActive }],
    };
    try {
      const url = service ? `/api/affiliate-program/services/${encodeURIComponent(service.pidService)}` : '/api/affiliate-program/services';
      const response = await fetch(url, { method: service ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Unable to save affiliate service.');
      router.refresh(); onDone();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save affiliate service.');
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="border-t border-border bg-muted/10 p-5 sm:p-6">
    {error ? <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</div> : null}
    <div className="grid gap-5 lg:grid-cols-2">
      <label className="grid gap-2 text-xs font-bold"><span>Display name</span><input name="displayName" defaultValue={service?.displayName || ''} required maxLength={140} className={field} /></label>
      <label className="grid gap-2 text-xs font-bold"><span>Service key</span><input name="serviceKey" defaultValue={service?.serviceKey || ''} required={!service} disabled={Boolean(service)} placeholder="SUPPLIER_REPORTS" className={`${field} font-mono text-xs font-bold uppercase disabled:bg-muted disabled:text-muted-foreground`} /></label>
      <label className="grid gap-2 text-xs font-bold lg:col-span-2"><span>Description</span><textarea name="description" defaultValue={service?.description || ''} rows={3} className="rounded-lg border border-input bg-background p-3 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
      <fieldset className="grid gap-2"><legend className="mb-2 text-xs font-bold">Commission type</legend><div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"><button type="button" onClick={() => setCommissionType('FIXED')} className={`rounded-md px-3 py-2.5 text-xs font-bold ${commissionType === 'FIXED' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Fixed amount</button><button type="button" onClick={() => setCommissionType('PERCENTAGE')} className={`rounded-md px-3 py-2.5 text-xs font-bold ${commissionType === 'PERCENTAGE' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Percentage</button></div></fieldset>
      <label className="grid gap-2 text-xs font-bold"><span>Eligible amount basis</span><input name="eligibleAmountBasis" defaultValue={service?.eligibleAmountBasis || 'QUALIFYING_PAYMENT'} required placeholder="QUALIFYING_PAYMENT" className={`${field} font-mono text-xs font-bold uppercase`} /></label>
      {commissionType === 'PERCENTAGE' ? <label className="grid gap-2 text-xs font-bold"><span>Percentage rate</span><div className="relative"><input name="percentageRate" type="number" min="0.0001" max="100" step="0.0001" defaultValue={service?.percentageRate ?? ''} required className={`${field} w-full pr-10 font-bold`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span></div></label> : <>
        <RateField currency="NGN" active={ngnActive} setActive={setNgnActive} defaultAmount={rateFor(service, 'NGN')?.fixedAmount} />
        <RateField currency="USD" active={usdActive} setActive={setUsdActive} defaultAmount={rateFor(service, 'USD')?.fixedAmount} />
      </>}
      <label className="grid gap-2 text-xs font-bold"><span>Display order</span><input name="sortOrder" type="number" min="0" max="10000" step="1" defaultValue={service?.sortOrder ?? 0} className={field} /></label>
      <fieldset className="grid gap-2"><legend className="mb-2 text-xs font-bold">Commission release</legend><div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"><button type="button" onClick={() => setApprovalMode('MANUAL')} className={`rounded-md px-3 py-2.5 text-xs font-bold ${approvalMode === 'MANUAL' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Manual review</button><button type="button" onClick={() => setApprovalMode('AUTOMATIC')} className={`rounded-md px-3 py-2.5 text-xs font-bold ${approvalMode === 'AUTOMATIC' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Automatic</button></div></fieldset>
      <label className="grid gap-2 text-xs font-bold"><span>Review period (days)</span><input name="reviewPeriodDays" type="number" min="0" max="365" step="1" defaultValue={service?.reviewPeriodDays ?? 14} required className={field} /><small className="font-medium leading-relaxed text-muted-foreground">Automatic commissions become available after this many complete days. Manual review is never auto-released.</small></label>
      <label className="grid gap-2 text-xs font-bold lg:col-span-2"><span>Exclusions and qualification notes</span><textarea name="exclusionNotes" defaultValue={service?.exclusionNotes || ''} rows={3} placeholder="State costs or conditions that do not earn commission." className="rounded-lg border border-input bg-background p-3 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-border pt-5">
      <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4 accent-primary" /> Eligible and active</label>
      <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} className="h-4 w-4 accent-primary" /> Earns on renewals</label>
      <div className="ml-auto flex gap-2"><button type="button" onClick={onDone} className="rounded-lg border border-border px-4 py-2.5 text-xs font-bold">Cancel</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{busy ? 'Saving…' : 'Save service'}</button></div>
    </div>
  </form>;
}

function RateField({ currency, active, setActive, defaultAmount }: { currency: 'NGN' | 'USD'; active: boolean; setActive: (active: boolean) => void; defaultAmount?: number | null }) {
  return <div className="grid gap-2"><span className="text-xs font-bold">{currency} commission</span><div className="flex gap-2"><input name={`${currency.toLowerCase()}Amount`} type="number" min="0.01" step="0.01" defaultValue={defaultAmount ?? ''} disabled={!active} required={active} placeholder={currency === 'NGN' ? '5000' : '5'} className={`${field} min-w-0 flex-1 font-bold disabled:bg-muted`} /><button type="button" onClick={() => setActive(!active)} className={`rounded-lg border px-3 text-xs font-bold ${active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' : 'border-border text-muted-foreground'}`}>{active ? 'Enabled' : 'Disabled'}</button></div></div>;
}

export function AffiliateProgramSettings({ services, canEdit }: { services: ProgramService[]; canEdit: boolean }) {
  const [editing, setEditing] = useState('');
  const [creating, setCreating] = useState(false);
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-4"><Metric label="Eligible services" value={services.filter((service) => service.active).length} /><Metric label="Automatic release" value={services.filter((service) => service.approvalMode === 'AUTOMATIC').length} /><Metric label="Manual review" value={services.filter((service) => service.approvalMode === 'MANUAL').length} /><Metric label="Tracked conversions" value={services.reduce((total, service) => total + service.conversionCount, 0)} /></div>
    <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-black">Commission services</h2><p className="mt-1 text-sm text-muted-foreground">Changes apply to future qualifying payments only.</p></div>{canEdit ? <button onClick={() => { setCreating(true); setEditing(''); }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"><Plus className="h-4 w-4" />Add service</button> : null}</div>
    {creating ? <section className="overflow-visible rounded-xl border border-primary/30 bg-card shadow-sm"><header className="flex items-center gap-3 p-5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Plus className="h-4 w-4" /></span><div><h3 className="font-black">New eligible service</h3><p className="text-xs text-muted-foreground">Create the stable key and commission rules used by payment integrations.</p></div></header><ServiceEditor onDone={() => setCreating(false)} /></section> : null}
    <div className="space-y-3">{services.map((service) => {
      const expanded = editing === service.pidService;
      const commission = service.commissionType === 'PERCENTAGE' ? `${service.percentageRate}%${service.recurring ? ' on purchase and renewals' : ''}` : service.rates.filter((rate) => rate.active && rate.fixedAmount).map((rate) => money(rate.fixedAmount!, rate.currency)).join(' · ') || 'No active rate';
      const releasePolicy = service.approvalMode === 'AUTOMATIC' ? `Auto-release after ${service.reviewPeriodDays} day${service.reviewPeriodDays === 1 ? '' : 's'}` : 'Manual review';
      return <section key={service.pidService} className={`overflow-visible rounded-xl border bg-card shadow-sm ${service.active ? 'border-border' : 'border-border opacity-75'}`}><button type="button" onClick={() => canEdit && setEditing(expanded ? '' : service.pidService)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-5 p-5 text-left sm:grid-cols-[minmax(220px,1.1fr)_minmax(190px,.8fr)_auto]"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate font-black">{service.displayName}</h3><span className={`rounded-md px-2 py-1 text-[9px] font-black uppercase ${service.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>{service.active ? 'Active' : 'Inactive'}</span></div><p className="mt-1 font-mono text-[10px] text-muted-foreground">{service.serviceKey}</p></div><div className="hidden min-w-0 sm:block"><strong className="text-sm">{commission}</strong><p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{service.eligibleAmountBasis.replaceAll('_', ' ')} · {releasePolicy}</p></div>{canEdit ? expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ShieldCheck className="h-4 w-4 text-muted-foreground" />}</button>{expanded ? <ServiceEditor service={service} onDone={() => setEditing('')} /> : null}</section>;
    })}</div>
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="rounded-xl border border-border bg-card p-5"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span><strong className="mt-3 block text-2xl">{value.toLocaleString()}</strong></article>;
}
