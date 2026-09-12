'use client';
import { useState } from 'react';
const criteria = [['audience', 'Relevant customer access', 30], ['acquisition', 'Customer acquisition plan', 25], ['operations', 'Operational readiness', 25], ['demand', 'Sales experience or demand', 10], ['understanding', 'Understanding of the partnership', 10]] as const;
const labels: Record<string, string> = { targetCustomers: 'Target customers', firstTenPlan: 'First 10 customers', audience: 'Audience and network', evidence: 'Evidence and public links', salesExperience: 'Sales experience', demand: 'Customer demand', operations: 'Daily operations', resources: 'Time, budget and launch date' };
const field = 'mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
function SavedEvidence({ assessment }: { assessment: unknown }) {
  const value = assessment as { evidence?: string; concerns?: string; scores?: Record<string, number>; overrideReason?: string };
  return <div className="space-y-3 text-sm text-muted-foreground">
    {value.scores ? <p>{criteria.map(([key, label]) => `${label}: ${value.scores?.[key] ?? '—'}/5`).join(' · ')}</p> : null}
    <p className="whitespace-pre-wrap"><strong>Evidence checked: </strong>{value.evidence || 'Not recorded'}</p>
    <p className="whitespace-pre-wrap"><strong>Concerns: </strong>{value.concerns || 'Not recorded'}</p>
    {value.overrideReason ? <p className="whitespace-pre-wrap"><strong>Override reason: </strong>{value.overrideReason}</p> : null}
  </div>;
}
export default function BusinessFitReview({ id, revision, answers, previous, pending, onSaved }: { id: string; revision: number; answers?: Record<string, unknown>; previous?: { decision: string; total: number; message: string; pilotTargets: string; pilotDays: number }; pending: boolean; onSaved: () => void }) {
  const [scores, setScores] = useState<Record<string, number>>({ audience: 0, acquisition: 0, operations: 0, demand: 0, understanding: 0 });
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const total = criteria.reduce((sum, [key, , weight]) => sum + scores[key] * weight / 5, 0);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setNotice('');
    try {
      const response = await fetch(`/api/partners/review/${encodeURIComponent(id)}/business-fit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, scores, decision: form.get('decision'), evidence: form.get('evidence'), concerns: form.get('concerns'), message: form.get('message'), hardBlockersCleared: form.has('hardBlockersCleared'), overrideReason: form.get('overrideReason'), pilotDays: Number(form.get('pilotDays')), pilotTargets: form.get('pilotTargets') }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Unable to save assessment.'); setNotice(result.message); onSaved();
    } catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  return <section className="space-y-6 border-t border-border pt-6">
    <div><h3 className="text-lg font-semibold">Business fit & pilot assessment</h3><p className="mt-2 text-sm text-muted-foreground">Separate from KYC. Judge relevant customer access and a credible plan, not follower count, personal background or budget alone.</p></div>
    {!answers ? <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm">Business-readiness answers have not been supplied. The applicant must complete them before a pilot can be approved.</p> : <dl className="grid gap-5 md:grid-cols-2">{Object.entries(labels).map(([key, label]) => <div key={key} className="rounded-lg border border-border p-4"><dt className="text-sm font-semibold">{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{String(answers[key] || 'Not supplied')}</dd></div>)}</dl>}
    {previous ? <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm"><strong>{previous.decision.replaceAll('_', ' ')} · {previous.total}/100</strong><p className="mt-2 whitespace-pre-wrap">{previous.message}</p>{previous.decision === 'PILOT_APPROVED' ? <p className="mt-2 whitespace-pre-wrap">{previous.pilotDays}-day pilot: {previous.pilotTargets}</p> : null}</div> : null}
    {previous ? <SavedEvidence assessment={previous} /> : null}
    {pending && answers ? <form onSubmit={submit} className="space-y-5"><fieldset disabled={busy} className="space-y-5">
      <p className="text-sm text-muted-foreground">Rate each area from 0 (no evidence) to 5 (strong verified evidence). 75+ suggests a pilot; 55–74 suggests clarification; below 55 suggests not ready. A reviewer makes the decision.</p>
      <div className="grid gap-4 sm:grid-cols-2">{criteria.map(([key, label, weight]) => <label key={key} className="text-sm font-medium">{label} · {weight}%<input type="number" required min={0} max={5} step={1} value={scores[key]} onChange={event => setScores({ ...scores, [key]: Number(event.target.value) })} className={field} /></label>)}</div>
      <p className="text-lg font-semibold">Weighted score: {total}/100</p>
      {(['PILOT_APPROVED', 'REQUEST_CHANGES', 'NOT_READY'] as const).map(value => <label key={value} className="flex items-center gap-3 text-sm"><input type="radio" name="decision" value={value} required />{value.replaceAll('_', ' ')}</label>)}
      <label className="block text-sm font-medium">Evidence checked (internal)<textarea name="evidence" required minLength={20} maxLength={2000} rows={3} className={field} /></label>
      <label className="block text-sm font-medium">Concerns and risk review (internal)<textarea name="concerns" required minLength={5} maxLength={2000} rows={3} className={field} /></label>
      <label className="block text-sm font-medium">Decision reason and next steps (visible to applicant)<textarea name="message" required minLength={20} maxLength={2000} rows={3} className={field} /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="hardBlockersCleared" className="mt-1" />I checked business credibility, product eligibility, customer promises and support capacity. There are no unresolved hard blockers to a pilot.</label>
      <label className="block text-sm font-medium">Reason for approving below 75, if applicable<textarea name="overrideReason" maxLength={1000} rows={2} className={field} /></label>
      <label className="block text-sm font-medium">Pilot duration (30–60 days)<input type="number" name="pilotDays" defaultValue={45} min={30} max={60} required className={field} /></label>
      <label className="block text-sm font-medium">Pilot targets and review plan<textarea name="pilotTargets" maxLength={2000} rows={3} className={field} placeholder="Agreed launch milestones, qualified enquiries or orders, response times, support limits, reviewer and review date. Required for pilot approval." /></label>
      <button className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{busy ? 'Saving…' : 'Save business-fit decision'}</button>
    </fieldset></form> : null}
    {notice ? <p role="status" className="text-sm">{notice}</p> : null}
  </section>;
}
