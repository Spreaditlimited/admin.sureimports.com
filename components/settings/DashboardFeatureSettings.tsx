'use client';
import { useEffect, useState } from 'react';
import { dashboardFeatures, type FeatureRules } from '@/lib/features/catalog';
export default function DashboardFeatureSettings() {
  const [rules, setRules] = useState<FeatureRules | null>(null);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function load(signal?: AbortSignal) {
    setError('');
    try {
      const response = await fetch('/api/dashboard-features', { cache: 'no-store', signal });
      const data = await response.json();
      if (!response.ok) throw Error(data.message);
      setRules(data.rules); setRevision(data.revision);
    } catch (error) { if (!signal?.aborted) setError((error as Error).message); }
  }
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/dashboard-features', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules, revision }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.message);
      setRevision(data.revision); setMessage(data.message);
    } catch (error) { setError((error as Error).message); } finally { setSaving(false); }
  }
  return <section className="rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="text-lg font-semibold">Dashboard feature availability</h2><p className="mt-2 text-sm text-muted-foreground">Choose which services appear for customers in Nigeria only. Country is the customer’s country of residence, selected during onboarding or in their profile—not the destination of an individual shipment. Account settings and support remain available everywhere.</p><form onSubmit={save} className="mt-5 space-y-4">{rules ? <div className="grid gap-3 md:grid-cols-2">{dashboardFeatures.map(feature => <div key={feature.key} className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"><label htmlFor={`feature-${feature.key}`} className="text-sm font-medium">{feature.label}</label><select id={`feature-${feature.key}`} disabled={saving} value={rules[feature.key] ? 'NG' : 'ALL'} onChange={e => setRules({ ...rules, [feature.key]: e.target.value === 'NG' })} className="min-h-11 rounded-md border border-input bg-background py-2 pl-3 pr-9 text-sm"><option value="ALL">All countries</option><option value="NG">Nigeria only</option></select></div>)}</div> : !error && <p role="status">Loading feature settings…</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}<div className="flex flex-col gap-3 sm:flex-row"><button type="submit" disabled={!rules || saving} className="min-h-11 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Saving…' : 'Save feature availability'}</button><button type="button" disabled={saving} onClick={() => void load()} className="min-h-11 rounded-lg border border-border px-5 py-3 text-sm">Reload saved settings</button></div></form></section>;
}
