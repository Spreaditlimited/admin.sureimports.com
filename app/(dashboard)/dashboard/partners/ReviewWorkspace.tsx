"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CommercialTerms from './CommercialTerms';
import BusinessFitReview from './BusinessFitReview';
import ReviewTextField from './ReviewTextField';
import { applicationStage, filterApplications } from '@/lib/partners/queue-presentation';
import {
  ClipboardCheck,
  FileText,
  Download,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Search,
  Building2,
  RefreshCw,
} from "lucide-react";

type Row = {
  id: string;
  legalName: string;
  registrationNumber: string;
  businessStatus: string;
  status: string;
  revision: number;
  submittedAt: string | null;
  businessFitDecision?: string | null;
};
type Person = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  roles?: string[];
  founder: boolean;
  ownershipPercent: number;
  idType: string;
};
type Case = Row & {
  agreement?: { status: string; current: boolean; paymentReady: boolean; receipt: {
    reference: string; acceptedAt: string; fullName: string; role: string;
    offer: { version: string; hash: string; mode: string; sections: { title: string; text: string }[]; schedule: { businessName: string; registrationNumber: string; serviceChargeBps: number; partnerShareBps: number; pricingRevision: number } };
  } | null } | null;
  details: {
    businessType: string;
    companyEra: string;
    taxId?: string;
    registeredAddress: string;
    people: Person[];
    businessReadiness?: Record<string, unknown>;
  } | null;
  review: {
    decision: string;
    message: string;
    evidenceReference: string;
    reviewedAt: string;
    businessFit?: { decision: string; total: number; message: string; pilotTargets: string; pilotDays: number };
  } | null;
  documents: { id: string; slot: string; mimeType: string; bytes: number }[];
  notifications?: { action: string; emailStatus: string; emailAttempts: number; emailSentAt: string | null; emailFailureCode: string | null; createdAt: string }[];
};
const field =
  "mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 text-base font-normal text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50";
const statusLabel = (status: string) =>
  ({
    SUBMITTED: "Awaiting review",
    VERIFIED: "KYC accepted",
    REJECTED: "KYC rejected",
    DRAFT: "Corrections requested",
  })[status] || status.replaceAll("_", " ");
export default function ReviewWorkspace({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Case | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [opening, setOpening] = useState<string | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const lastOpened = useRef<string | null>(null);
  const listScroll = useRef(0);
  const visibleRows = filterApplications(rows, query, group);
  const requestId = useRef(0);
  useEffect(() => {
    if (selected) { detailHeading.current?.focus({preventScroll:true}); detailHeading.current?.scrollIntoView({block:'start', behavior: 'instant'}); }
  }, [selected?.id]);
  function backToList() {
    requestId.current++; setSelected(null); setBusy(false); setOpening(null);
    requestAnimationFrame(() => { window.scrollTo({top:listScroll.current,behavior:'instant'}); if(lastOpened.current)document.getElementById(`application-${lastOpened.current}`)?.focus({preventScroll:true}); });
  }
  async function open(id: string) {
    const version = ++requestId.current;
    if (!selected) listScroll.current = window.scrollY;
    lastOpened.current = id;
    setOpening(id);
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/partners/review/${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load case.");
      if (version === requestId.current) setSelected(data);
    } catch (error) {
      if (version === requestId.current) setNotice((error as Error).message);
    } finally {
      if (version === requestId.current) { setBusy(false); setOpening(null); }
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/partners/review/${encodeURIComponent(selected.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision: selected.revision,
            decision: form.get("decision"),
            message: form.get("message"),
            evidenceReference: form.get("evidenceReference"),
            checkedRegistration: form.has("checkedRegistration"),
            checkedIdentity: form.has("checkedIdentity"),
            checkedOwnership: form.has("checkedOwnership"),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to record review.");
      setNotice(data.message);
      await open(selected.id);
      setNotice(data.message);
      router.refresh();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <p
        role="status"
        aria-live="polite"
        className={
          busy || notice
            ? "flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground"
            : "sr-only"
        }
      >
        {busy && (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        )}
        {busy ? opening ? 'Opening application…' : 'Saving your review…' : notice}
      </p>
      {!rows.length && !selected && (
        <section className="py-24 text-center border-2 border-dashed border-border rounded-xl bg-muted/5 mx-2">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" aria-hidden="true" />
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground italic">No partner applications found</p>
        </section>
      )}
      {(rows.length > 0 || selected) && (
        <div className="space-y-6">
          {!selected && <section
            aria-label="Applications"
            className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
          >
            <header className="space-y-5 border-b border-border p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Application queue</h2><p className="mt-1 text-sm text-muted-foreground">See what needs attention, then open a business to review it.</p></div><span className="text-sm text-muted-foreground">{rows.length} on this page</span></div>
              <label className="relative block"><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" /><span className="sr-only">Search applications on this page</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this page by business or registration number" className="min-h-11 w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
              <div className="flex flex-wrap gap-2" aria-label="Filter applications on this page">{[['all','All'],['review','Needs review'],['corrections','Corrections'],['approved','Approved'],['decided','Not approved']].map(([value,label]) => <button key={value} type="button" aria-pressed={group === value} onClick={() => setGroup(value)} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${group === value ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{label}<span className="tabular-nums opacity-70">{value === 'all' ? rows.length : rows.filter(row => applicationStage(row).group === value).length}</span></button>)}</div>
            </header>
            <div className="hidden grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_8rem_2rem] gap-5 border-b border-border bg-muted/20 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid" aria-hidden="true"><span>Business</span><span>Approval progress</span><span>Submitted</span><span /></div>
            <div className="divide-y divide-border">
              {visibleRows.map(row => { const stage = applicationStage(row); return <button type="button" id={`application-${row.id}`} key={row.id} disabled={busy} aria-label={`Open ${row.legalName} — ${stage.label}`} aria-busy={opening === row.id} onClick={() => open(row.id)} className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60 sm:p-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_8rem_2rem] lg:gap-5">
                <span className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground"><Building2 size={20} aria-hidden="true" /></span><span className="min-w-0"><strong className="block break-words text-base font-semibold">{row.legalName}</strong><span className="mt-1 block text-sm text-muted-foreground">{row.registrationNumber}</span></span></span>
                <span className="col-start-1 row-start-2 space-y-2 lg:col-auto lg:row-auto"><span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${stage.group === 'approved' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-border bg-background text-foreground'}`}>{stage.label}</span><span className="block text-sm text-muted-foreground">{stage.detail}</span><span className="flex max-w-32 gap-1" aria-label={`${stage.complete} of 3 approval stages complete`}>{[1,2,3].map(step => <span key={step} className={`h-1 flex-1 rounded-full ${step <= stage.complete ? 'bg-primary' : 'bg-muted'}`} />)}</span></span>
                <span className="col-start-1 text-sm tabular-nums text-muted-foreground lg:col-auto"><span className="lg:hidden">Submitted </span>{row.submittedAt?.slice(0,10) || '—'}</span>
                <span className="col-start-2 row-start-1 self-start pt-3 lg:col-auto lg:row-auto lg:self-auto lg:pt-0">{opening === row.id ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />}</span>
              </button>; })}
              {!visibleRows.length ? <div className="px-6 py-16 text-center"><Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" aria-hidden="true" /><h3 className="font-semibold">No matching applications</h3><p className="mt-2 text-sm text-muted-foreground">Try another business name or change the filter on this page.</p><button type="button" onClick={() => {setQuery('');setGroup('all');}} className="mt-4 min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Clear filters</button></div> : null}
            </div>
          </section>}
          {selected && <section
            aria-label="Selected application"
            className="min-w-0 rounded-xl border border-border bg-card p-5 text-foreground sm:p-7"
          >
              <div className="space-y-7" key={selected.id}>
                <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={busy} onClick={backToList} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><ArrowLeft size={16} aria-hidden="true" />Applications</button><button type="button" disabled={busy} onClick={() => open(selected.id)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" className={busy ? 'animate-spin' : ''} />Refresh</button></div>
                <header className="border-b border-border pb-5">
                  <span className="mb-3 inline-flex rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {statusLabel(selected.status)}
                  </span>
                  <h2 ref={detailHeading} tabIndex={-1} className="scroll-mt-24 break-words text-2xl font-bold tracking-tight outline-none">
                    {selected.legalName}
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Registration {selected.registrationNumber} · Business{" "}
                    {selected.businessStatus}
                  </p>
                </header>
                <section aria-label="Approval progress" className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <h3 className="text-lg font-semibold">Application approval · four steps</h3>
                  <p className="text-sm leading-6 text-muted-foreground">Approve the business plan and verify the documents. The partner then accepts its agreement and its account activates automatically.</p>
                  <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ['Business fit', selected.review?.businessFit?.decision === 'PILOT_APPROVED' ? 'Approved for a pilot' : selected.review?.businessFit?.decision === 'REQUEST_CHANGES' ? 'Clarification requested' : selected.review?.businessFit?.decision === 'NOT_READY' ? 'Not ready' : 'Review required', '#business-fit-review'],
                      ['Business verification', selected.status === 'VERIFIED' ? 'Documents accepted' : selected.status === 'DRAFT' ? 'Awaiting corrections' : selected.status === 'REJECTED' ? 'Not accepted' : 'Review required', '#business-verification-review'],
                      ['Agreement', selected.agreement?.status === 'AWAITING_CONFIRMATION' || selected.businessStatus === 'ACTIVE' ? 'Accepted by business' : selected.agreement?.status === 'AWAITING_ACCEPTANCE' ? 'Awaiting Agreement Acceptance by Business' : 'Unlocks after the first two steps', '#final-business-approval'],
                      ['Account activation', selected.businessStatus === 'ACTIVE' ? 'Active' : 'Automatic after acceptance', '#final-business-approval'],
                    ].map(([label, state, href], index) => <li key={label} className="rounded-lg border border-border bg-background p-3"><a href={href} className="block font-semibold underline-offset-4 hover:underline">{index + 1}. {label}</a><p className="mt-2 text-sm text-muted-foreground">{state}</p></li>)}
                  </ol>
                  <p className="text-sm font-medium">{selected.businessStatus === 'ACTIVE' ? 'All approval stages are complete.' : selected.review?.businessFit?.decision !== 'PILOT_APPROVED' ? 'Next: complete the business-fit review below.' : selected.status !== 'VERIFIED' ? 'Next: review the documents and select “Accept business verification” below.' : selected.agreement?.status === 'AWAITING_CONFIRMATION' ? 'Agreement acceptance activates the account automatically. Refresh to view the latest status.' : 'Awaiting Agreement Acceptance by Business. The business must select Read and Accept Agreement in their dashboard.'}</p>
                </section>
                {selected.details && (
                  <>
                    <section>
                      <h3 className="text-lg font-semibold">
                        Business details
                      </h3>
                      <dl className="mt-4 grid gap-5 rounded-lg bg-muted/40 p-4 text-base [overflow-wrap:anywhere] sm:grid-cols-2">
                        <div>
                          <dt className="text-sm text-muted-foreground">
                            Registration type
                          </dt>
                          <dd>
                            {selected.details.businessType.replaceAll("_", " ")}{" "}
                            · {selected.details.companyEra}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground">
                            Registered address
                          </dt>
                          <dd>{selected.details.registeredAddress}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground">
                            Tax ID
                          </dt>
                          <dd>{selected.details.taxId || "Not supplied"}</dd>
                        </div>
                      </dl>
                    </section>
                    <section>
                      <h3 className="text-lg font-semibold">
                        People & ownership
                      </h3>
                      <div className="mt-4 grid gap-3 2xl:grid-cols-2">
                        {selected.details.people.map((person) => (
                          <article
                            key={person.id}
                            className="space-y-2 rounded-lg border border-border p-4 text-base leading-relaxed [overflow-wrap:anywhere]"
                          >
                            <strong>{person.fullName}</strong>
                            <p>
                              {(person.roles ?? [person.role]).map(role => role.replaceAll("_", " ")).join(" · ")} ·{" "}
                              {person.ownershipPercent}%
                              {person.founder ? " · Founder" : ""}
                            </p>
                            <p className="text-muted-foreground">
                              {person.email}
                              <br />
                              {person.phone}
                              <br />
                              ID: {person.idType.replaceAll("_", " ")}
                            </p>
                          </article>
                        ))}
                      </div>
                    </section>
                  </>
                )}
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <FileText
                      aria-hidden="true"
                      className="h-5 w-5 text-muted-foreground"
                    />
                    Evidence documents
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Treat uploads as untrusted files. Use your approved secure
                    viewer and verification process.
                  </p>
                  <ul className="mt-3 divide-y divide-border">
                    {selected.documents.map((doc) => (
                      <li
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                        key={doc.id}
                      >
                        <span className="min-w-0 break-words">
                          {doc.slot.startsWith("identity:")
                            ? `Identity: ${selected.details?.people.find((p) => p.id === doc.slot.slice(9))?.fullName || "Person"}`
                            : doc.slot.replaceAll("_", " ")}
                          <small className="block text-sm text-muted-foreground">
                            {Math.ceil(doc.bytes / 1024)} KB
                          </small>
                        </span>
                        <a
                          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          href={`/api/partners/review/${encodeURIComponent(selected.id)}/documents/${encodeURIComponent(doc.id)}`}
                        >
                          <Download aria-hidden="true" className="h-4 w-4" />
                          Download
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
                <BusinessFitReview key={`${selected.id}:${selected.revision}`} id={selected.id} revision={selected.revision} answers={selected.details?.businessReadiness} previous={selected.review?.businessFit} pending={selected.businessStatus === 'PENDING' && ['SUBMITTED', 'VERIFIED'].includes(selected.status)} onSaved={() => { void open(selected.id); router.refresh(); }} />
                {selected.review?.decision && (
                  <section className="rounded-lg border border-border p-4">
                    <h3 className="font-semibold">Previous review</h3>
                    <p className="mt-2 whitespace-pre-wrap">
                      {selected.review.message}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selected.review.decision} ·{" "}
                      {selected.review.reviewedAt.slice(0, 10)} · Evidence:{" "}
                      {selected.review.evidenceReference || "—"}
                    </p>
                  </section>
                )}
                <section id="business-verification-review" className="scroll-mt-24">
                {selected.status === "SUBMITTED" && (
                  <form
                    aria-busy={busy}
                    onSubmit={submit}
                    className="space-y-5 border-t border-border pt-6"
                  >
                    <h3 className="text-lg font-semibold">Step 2 · Business verification</h3>
                    <p className="text-sm text-muted-foreground">Check registration, identity and ownership evidence. Accepting these documents completes verification, not final business approval.</p>
                    <fieldset className="space-y-3">
                      <legend className="mb-2 text-sm text-muted-foreground">
                        Decision
                      </legend>
                      {[
                        ["REQUEST_CHANGES", "Request corrections"],
                        ["VERIFIED", "Accept business verification"],
                        ["REJECTED", "Reject KYC"],
                      ].map(([value, label]) => (
                        <label
                          key={value}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-colors has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5"
                        >
                          <input
                            required
                            type="radio"
                            name="decision"
                            value={value}
                            disabled={busy}
                            className="h-4 w-4 shrink-0 accent-primary focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                    <ReviewTextField key={`${selected.id}:kyc-message`} name="message" label="Message for the applicant" suggestions="kycMessage" required minLength={10} disabled={busy} hint="Explain corrections or the decision. Do not include internal risk notes." />
                    <ReviewTextField key={`${selected.id}:kyc-evidence`} name="evidenceReference" label="Internal verification evidence reference" suggestions="evidenceReference" maxLength={500} disabled={busy} hint="Required for acceptance. Add the actual check references; do not paste BVNs or ID numbers." />
                    <fieldset className="space-y-3">
                      <legend className="mb-2 text-sm text-muted-foreground">
                        Required checks before acceptance
                      </legend>
                      {[
                        [
                          "checkedRegistration",
                          "Business registration independently checked",
                        ],
                        ["checkedIdentity", "Identity checks completed"],
                        ["checkedOwnership", "Ownership and authority checked"],
                      ].map(([name, label]) => (
                        <label key={name} className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            name={name}
                            disabled={busy}
                            className="mt-1 h-4 w-4 shrink-0 accent-primary focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                    <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                      This records a manual review, not an automated identity
                      check. Business activation, affiliate exclusion, banking
                      and payment enablement are separate.
                    </p>
                    <button
                      disabled={busy}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 sm:w-auto"
                    >
                      {busy ? "Saving…" : "Save verification decision"}
                    </button>
                  </form>
                )}
                {selected.status !== 'SUBMITTED' ? <p className="text-sm text-muted-foreground">Step 2 · {statusLabel(selected.status)}. {selected.status === 'VERIFIED' ? 'Once business fit is approved, the business can accept its agreement to activate automatically.' : 'A new submission is required before this verification can be reviewed again.'}</p> : null}
                </section>
                <CommercialTerms key={selected.id} partnerId={selected.id} onSaved={() => { void open(selected.id); router.refresh(); }} />
                <section id="final-business-approval" className="scroll-mt-24">
                <div className="my-6 space-y-3 rounded-xl border border-border bg-background p-5">
                  <h3 className="text-lg font-semibold">Step 3 · Partner agreement</h3>
                  {selected.agreement?.receipt ? <>
                    <p className="text-base">Agreement accepted by <strong>{selected.agreement?.receipt.fullName}</strong> · {selected.agreement?.receipt.role}</p>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Reference</dt><dd className="break-all">{selected.agreement?.receipt.reference}</dd></div><div><dt className="text-muted-foreground">Accepted at</dt><dd>{selected.agreement?.receipt.acceptedAt.replace('T', ' ').replace('Z', ' UTC')}</dd></div><div><dt className="text-muted-foreground">Version</dt><dd>{selected.agreement?.receipt.offer.version}</dd></div><div><dt className="text-muted-foreground">Accepted schedule</dt><dd>{selected.agreement?.receipt.offer.schedule.serviceChargeBps / 100}% service charge · {selected.agreement?.receipt.offer.schedule.partnerShareBps / 100}% partner allocation, both of product cost</dd></div></dl>
                    <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium" onClick={() => {
                      const record = selected.agreement?.receipt!;
                      const text = ['SURE IMPORTS — AGREEMENT ACCEPTANCE', `Reference: ${record.reference}`, `Accepted: ${record.acceptedAt}`, `Signer: ${record.fullName} (${record.role})`, `Version: ${record.offer.version}`, `Hash: ${record.offer.hash}`, ...record.offer.sections.map(section => `\n${section.title}\n${section.text}`), '\nAccepted commercial snapshot', JSON.stringify(record.offer.schedule, null, 2)].join('\n');
                      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
                      const link = document.createElement('a'); link.href = url; link.download = 'partner-agreement-receipt.txt'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}><Download size={16} />Download agreement receipt</button>
                    <p className="text-sm text-muted-foreground">{selected.agreement?.current ? 'Acceptance is recorded against the current agreement and commercial schedule.' : 'The agreement or review has changed. The business must accept the current version to complete activation.'}</p>
                  </> : <p className="text-base text-muted-foreground">{selected.agreement?.status === 'LOCKED' ? 'Agreement unlocks automatically once business fit and business verification are approved.' : 'Awaiting Agreement Acceptance by Business. The business dashboard now prompts them to Read and Accept Agreement.'}</p>}
                </div>
                <p className="text-sm text-muted-foreground">Account activation and payment collection are enabled automatically when the business accepts its agreement after both reviews are approved. No further admin action is required. The partner can then customize its storefront and connect its domain before publishing.</p>
                </section>
                {selected.notifications?.length ? <section className="space-y-3 border-t border-border pt-6"><h3 className="text-lg font-semibold">Email updates</h3><p className="text-sm text-muted-foreground">Updates go to the owner’s sign-in email. Queued messages are normally processed within five minutes. “Sent” means accepted by the mail server, not confirmed inbox delivery.</p><ul className="divide-y divide-border">{selected.notifications.map((event, index) => <li key={`${event.createdAt}-${index}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{event.action === 'BUSINESS_FIT_APPROVED' ? 'Business fit approved' : event.action === 'BUSINESS_FIT_CHANGES' ? 'Business-fit clarification' : event.action === 'BUSINESS_FIT_NOT_READY' ? 'Business-fit decision' : event.action === 'BUSINESS_ACTIVATED' ? 'Partner account activated' : event.action.replaceAll('_', ' ').toLowerCase()}</span><strong>{event.emailStatus === 'SENT' ? 'Sent' : event.emailStatus === 'FAILED' ? 'Failed — support follow-up required' : event.emailStatus === 'SENDING' ? 'Sending' : event.emailAttempts > 0 ? 'Retry scheduled' : 'Queued'}</strong></li>)}</ul></section> : null}
              </div>
          </section>}
        </div>
      )}
    </div>
  );
}
