'use client';

import { useState } from 'react';
import { RefreshCw, Send, ShieldCheck } from 'lucide-react';

type Step = { pidStep: string; stepNumber: number; title: string; subject: string };

export default function EmailOperations({ steps }: { steps: Step[] }) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [pidStep, setPidStep] = useState(steps[0]?.pidStep || '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function call(url: string, body?: object) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(url, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Request failed.');
      setMessage(result.delivery ? `Sent. SES message ID: ${result.delivery.sesMessageId}` : 'Completed successfully.');
      if (url.includes('/seed')) window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed.');
    } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Send className="h-4 w-4" /></div>
          <div><h2 className="font-bold">Internal SES test</h2><p className="text-xs text-muted-foreground">Use only an internal allowlisted address or an SES mailbox simulator.</p></div>
        </div>
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-xs font-semibold">Recipient email
            <input className="rounded-lg border border-border bg-background px-3 py-2.5 font-normal" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="verified@example.com" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">First name
            <input className="rounded-lg border border-border bg-background px-3 py-2.5 font-normal" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Optional" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">Sequence email
            <select className="rounded-lg border border-border bg-background px-3 py-2.5 font-normal" value={pidStep} onChange={(e) => setPidStep(e.target.value)}>
              {steps.map((step) => <option key={step.pidStep} value={step.pidStep}>{step.stepNumber}. {step.subject}</option>)}
            </select>
          </label>
          <button disabled={busy || !email || !pidStep} onClick={() => call('/api/marketing/email/test-send', { email, firstName, pidStep })} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {busy ? 'Working…' : 'Send test email'}
          </button>
          <p className="text-[11px] leading-relaxed text-muted-foreground">Customer confirmation is handled separately through the branded Sure Imports double-opt-in email. Do not use this form for customers while SES remains in sandbox.</p>
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600"><ShieldCheck className="h-4 w-4" /></div>
          <div><h2 className="font-bold">Operations</h2><p className="text-xs text-muted-foreground">Safe administrative controls.</p></div>
        </div>
        <div className="grid gap-3">
          <button disabled={busy} onClick={() => call('/api/marketing/email/sequence/seed')} className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Import or refresh 53 emails</button>
          <button disabled={busy} onClick={() => call('/api/marketing/email/events/process')} className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Process SES events now</button>
        </div>
        {message && <p className="mt-4 break-words rounded-lg bg-muted p-3 text-xs leading-relaxed">{message}</p>}
      </section>
    </div>
  );
}
