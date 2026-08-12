'use client';

import { useState } from 'react';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ResearchFeeSettings({
  initialPricing,
}: {
  initialPricing: { priceNaira: number; priceUsdCents: number };
}) {
  const [priceNaira, setPriceNaira] = useState(initialPricing.priceNaira);
  const [priceUsd, setPriceUsd] = useState((initialPricing.priceUsdCents / 100).toFixed(2));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/corporate-sourcing/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceNaira, priceUsdCents: Math.round(Number(priceUsd) * 100) }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Could not save the research fee.');
      setPriceNaira(data.data.priceNaira);
      setPriceUsd((data.data.priceUsdCents / 100).toFixed(2));
      toast.success('Corporate Sourcing research fee updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the research fee.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">Research Fee Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Paystack uses the naira fee. PayPal uses the dollar fee.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[180px_180px_auto]">
          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Naira fee</span>
            <div className="mt-2 flex rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
              <span className="px-3 py-2.5 text-sm font-bold text-muted-foreground">₦</span>
              <input type="number" min="1" value={priceNaira} onChange={(event) => setPriceNaira(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-sm font-bold text-foreground outline-none" />
            </div>
          </label>
          <label>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dollar fee</span>
            <div className="mt-2 flex rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
              <span className="px-3 py-2.5 text-sm font-bold text-muted-foreground">$</span>
              <input type="number" min="0.01" step="0.01" value={priceUsd} onChange={(event) => setPriceUsd(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-sm font-bold text-foreground outline-none" />
            </div>
          </label>
          <button type="button" onClick={save} disabled={saving} className="mt-auto inline-flex h-[42px] items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save fees'}
          </button>
        </div>
      </div>
    </section>
  );
}
