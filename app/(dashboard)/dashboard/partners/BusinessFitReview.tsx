'use client';
import { useEffect, useRef, useState } from 'react';
import { fitCriteria as criteria, fitScoresSchema, weightedFitScore, type AutomaticFit, type FitScores } from '@/lib/partners/business-fit-policy';
import ReviewTextField from './ReviewTextField';
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
export default function BusinessFitReview({ id, revision, answers, previous, pending, onSaved }: { id: string; revision: number; answers?: Record<string, unknown>; previous?: { decision: string; total: number; message: string; pilotTargets: string; pilotDays: number; scores?: FitScores }; pending: boolean; onSaved: () => void }) {
  const [scores, setScores] = useState<FitScores>(previous?.scores || { audience: 0, acquisition: 0, operations: 0, demand: 0, understanding: 0 });
  const scoresEdited = useRef(Boolean(previous));
  const [assessment, setAssessment] = useState<AutomaticFit | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const hasAnswers = Boolean(answers);
  useEffect(() => {
    if (!pending || !hasAnswers) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    setAssessing(true); setAssessmentError('');
    async function load() {
      try {
        const response = await fetch(`/api/partners/review/${encodeURIComponent(id)}/business-fit/assessment`, { method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Automatic scoring is unavailable. You can still review manually.');
        if (controller.signal.aborted) return;
        if (result.status === 'RUNNING') {
          if (++polls > 30) throw new Error('Scoring is taking longer than expected. Retry shortly or review manually.');
          timer = setTimeout(load, 3000); return;
        }
        setAssessment(result.assessment);
        if (!scoresEdited.current) setScores(result.assessment.scores);
        setAssessing(false);
      } catch (error) {
        if (!controller.signal.aborted) { setAssessmentError(error instanceof Error ? error.message : 'Unable to load automatic scoring.'); setAssessing(false); }
      }
    }
    void load();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [id, revision, pending, hasAnswers, attempt]);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const validScores = fitScoresSchema.safeParse(scores);
  const total = validScores.success ? weightedFitScore(validScores.data) : null;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validScores.success) { setNotice('Choose a rating from 0 to 5 for every category.'); return; }
    const form = new FormData(event.currentTarget); setBusy(true); setNotice('');
    try {
      const response = await fetch(`/api/partners/review/${encodeURIComponent(id)}/business-fit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, scores, decision: form.get('decision'), evidence: form.get('evidence'), concerns: form.get('concerns'), message: form.get('message'), hardBlockersCleared: form.has('hardBlockersCleared'), overrideReason: form.get('overrideReason'), pilotDays: Number(form.get('pilotDays')), pilotTargets: form.get('pilotTargets') }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Unable to save assessment.'); setNotice(result.message); onSaved();
    } catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  return <section id="business-fit-review" className="scroll-mt-24 space-y-6 border-t border-border pt-6">
    <div><h3 className="text-lg font-semibold">Step 1 · Business fit</h3><p className="mt-2 text-sm text-muted-foreground">Assess the business plan and customer access. Approving a pilot here completes only this stage, not business verification or final approval.</p></div>
    {!answers ? <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm">Business-readiness answers have not been supplied. The applicant must complete them before a pilot can be approved.</p> : <dl className="grid gap-5 md:grid-cols-2">{Object.entries(labels).map(([key, label]) => <div key={key} className="rounded-lg border border-border p-4"><dt className="text-sm font-semibold">{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{String(answers[key] || 'Not supplied')}</dd></div>)}</dl>}
    {previous ? <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm"><strong>{previous.decision.replaceAll('_', ' ')} · {previous.total}/100</strong><p className="mt-2 whitespace-pre-wrap">{previous.message}</p>{previous.decision === 'PILOT_APPROVED' ? <p className="mt-2 whitespace-pre-wrap">{previous.pilotDays}-day pilot: {previous.pilotTargets}</p> : null}</div> : null}
    {previous ? <SavedEvidence assessment={previous} /> : null}
    {pending && hasAnswers ? <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4 sm:p-5" aria-busy={assessing}>
      <div><h4 className="font-semibold">Automatic assessment{assessment ? ` · ${assessment.total}/100` : ''}</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">Scores reflect the written answers, not independently verified evidence. Review the reasons and adjust scores if needed. No decision is made automatically.</p></div>
      {assessing ? <p role="status" className="text-sm">Reading and weighting the responses… You can continue your review.</p> : null}
      {assessmentError ? <div role="status" className="space-y-3 text-sm"><p>{assessmentError}</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 rounded-lg border border-border bg-background px-4 py-2 font-medium hover:bg-muted">Retry automatic assessment</button></div> : null}
      {assessment ? <>
        <dl className="grid gap-4 md:grid-cols-2">{criteria.map(([key, label, weight]) => <div key={key}><dt className="text-sm font-semibold">{label} · {assessment.scores[key]}/5 · {weight}%</dt><dd className="mt-2 text-sm leading-6 text-muted-foreground">{assessment.explanations[key].reason}<span className="mt-1 block">Based on: {assessment.explanations[key].sources.map(source => labels[source]).join(', ')}</span></dd></div>)}</dl>
        {([['Strengths', assessment.strengths], ['Concerns to review', assessment.concerns], ['Follow-up questions', assessment.followUps]] as const).map(([label, items]) => items.length ? <div key={label}><h5 className="text-sm font-semibold">{label}</h5><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">{items.map((item, index) => <li key={`${label}-${index}`}>{item}</li>)}</ul></div> : null)}
        <p className="text-sm text-muted-foreground">Rubric {assessment.policyVersion}. {assessment.total >= 75 ? 'Score range suggests considering a pilot.' : assessment.total >= 55 ? 'Score range suggests requesting clarification.' : 'Score range suggests more preparation is needed.'} Final decision: admin.</p>
      </> : null}
    </div> : null}
    {pending && answers ? <form onSubmit={submit} className="space-y-5"><fieldset disabled={busy} className="space-y-5">
      <p className="text-sm text-muted-foreground">The automatic scores populate below unless you have already edited them or saved a previous review. Scores range from 0 (no relevant information) to 5 (a detailed, coherent plan with concrete examples). Adjust them after checking the evidence.</p>
      <div className="grid gap-4 sm:grid-cols-2">{criteria.map(([key, label, weight]) => <fieldset key={key} className="min-w-0 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold">{label}</legend>
        <p className="mb-3 text-sm text-muted-foreground">Up to {weight} points · {weight}% of the total</p>
        <div className="grid grid-cols-6 gap-2">{[0,1,2,3,4,5].map(rating => <label key={rating} className="cursor-pointer">
          <input className="peer sr-only" type="radio" name={'score-'+key} value={rating} checked={scores[key]===rating} required onChange={() => {scoresEdited.current=true;setScores(current=>({...current,[key]:rating}));}} aria-label={label+': '+rating+' out of 5'} />
          <span className="flex min-h-11 items-center justify-center rounded-md border border-input bg-background text-sm font-semibold text-foreground peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">{rating}</span>
        </label>)}</div>
        <p className="mt-3 text-sm font-medium">{Number.isInteger(scores[key]) && scores[key]>=0 && scores[key]<=5 ? scores[key]+'/5 → '+(scores[key]*weight/5)+'/'+weight+' points' : 'Choose a rating from 0 to 5.'}</p>
      </fieldset>)}</div>
      <div className="rounded-lg border border-border bg-muted/30 p-4" aria-live="polite"><p className="text-lg font-semibold">Total weighted score: {total === null ? 'Select valid ratings' : total+'/100'}</p><p className="mt-2 text-sm text-muted-foreground">Each contribution = rating ÷ 5 × category weight. For example, 4/5 in customer access earns 24/30 points.</p></div>
      {(['PILOT_APPROVED', 'REQUEST_CHANGES', 'NOT_READY'] as const).map(value => <label key={value} className="flex items-center gap-3 text-sm"><input type="radio" name="decision" value={value} required />{{PILOT_APPROVED: 'Approve business fit for a pilot (Step 1 only)', REQUEST_CHANGES: 'Request business-plan clarification', NOT_READY: 'Business not ready for a pilot'}[value]}</label>)}
      <ReviewTextField name="evidence" label="Evidence checked (internal)" suggestions="evidence" required minLength={20} />
      <ReviewTextField name="concerns" label="Concerns and risk review (internal)" suggestions="concerns" required minLength={5} />
      <ReviewTextField name="message" label="Decision reason and next steps (visible to applicant)" suggestions="message" required minLength={20} />
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="hardBlockersCleared" className="mt-1" />I checked business credibility, product eligibility, customer promises and support capacity. There are no unresolved hard blockers to a pilot.</label>
      <ReviewTextField name="overrideReason" label="Reason for approving below 75, if applicable" suggestions="overrideReason" maxLength={1000} />
      <label className="block text-sm font-medium">Pilot duration (30–60 days)<input type="number" name="pilotDays" defaultValue={45} min={30} max={60} required className={field} /></label>
      <ReviewTextField name="pilotTargets" label="Pilot targets and review plan" suggestions="pilotTargets" placeholder="Agreed launch milestones, qualified enquiries or orders, response times, support limits, reviewer and review date. Required for pilot approval." />
      <button disabled={busy || !validScores.success} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Saving…' : 'Save business-fit decision'}</button>
    </fieldset></form> : null}
    {notice ? <p role="status" className="text-sm">{notice}</p> : null}
  </section>;
}
