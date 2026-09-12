"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BusinessFitReview from './BusinessFitReview';
import { PARTNER_ACTIVATION_ROLLOUT_READY } from '@/lib/partners/activation-policy';
import {
  ClipboardCheck,
  FileText,
  Download,
  Loader2,
  ArrowRight,
} from "lucide-react";

type Row = {
  id: string;
  legalName: string;
  registrationNumber: string;
  businessStatus: string;
  status: string;
  revision: number;
  submittedAt: string | null;
};
type Person = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  founder: boolean;
  ownershipPercent: number;
  idType: string;
};
type Case = Row & {
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
  const requestId = useRef(0);
  async function open(id: string) {
    const version = ++requestId.current;
    setSelected(null);
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
      if (version === requestId.current) setBusy(false);
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
      setSelected(null);
      setNotice(data.message);
      router.refresh();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function activate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy || !PARTNER_ACTIVATION_ROLLOUT_READY) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setNotice('');
    try {
      const response = await fetch(`/api/partners/review/${encodeURIComponent(selected.id)}/activate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: selected.revision, agreementReference: form.get('agreementReference'), agreementReviewed: form.has('agreementReviewed') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Activation failed.');
      setSelected(null); setNotice(data.message); router.refresh();
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
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
        {busy ? "Working…" : notice}
      </p>
      {!rows.length && (
        <section className="py-24 text-center border-2 border-dashed border-border rounded-xl bg-muted/5 mx-2">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" aria-hidden="true" />
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground italic">No partner applications found</p>
        </section>
      )}
      {rows.length > 0 && (
        <div className="space-y-6">
          {!selected && <section
            aria-label="Applications"
            className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
          >
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="font-semibold">Review queue</h2>
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {rows.length} on this page
              </span>
            </header>
            <div className="space-y-2 p-3">
              {rows.length ? (
                rows.map((row) => (
                  <button
                    type="button"
                    key={row.id}
                    disabled={busy}
                    onClick={() => open(row.id)}
                    className="group w-full rounded-lg border border-transparent p-4 text-left text-foreground transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-primary">
                      {statusLabel(row.status)}
                    </span>
                    <strong className="mt-3 block break-words text-base font-semibold">
                      {row.legalName}
                    </strong>
                    <span className="mt-1 block text-base text-muted-foreground">
                      {row.registrationNumber}
                    </span>
                    <span className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span>
                        Submitted {row.submittedAt?.slice(0, 10) || "—"}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0"
                      />
                    </span>
                  </button>
                ))
              ) : (
                <p className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
                  No submitted applications yet.
                </p>
              )}
            </div>
          </section>}
          {selected && <section
            aria-label="Selected application"
            className="min-w-0 rounded-xl border border-border bg-card p-5 text-foreground sm:p-7"
          >
              <div className="space-y-7" key={selected.id}>
                <button type="button" disabled={busy} onClick={() => setSelected(null)} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Back to applications</button>
                <header className="border-b border-border pb-5">
                  <span className="mb-3 inline-flex rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {statusLabel(selected.status)}
                  </span>
                  <h2 className="break-words text-2xl font-bold tracking-tight">
                    {selected.legalName}
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Registration {selected.registrationNumber} · Business{" "}
                    {selected.businessStatus}
                  </p>
                </header>
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
                              {person.role.replaceAll("_", " ")} ·{" "}
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
                <BusinessFitReview key={`${selected.id}:${selected.revision}`} id={selected.id} revision={selected.revision} answers={selected.details?.businessReadiness} previous={selected.review?.businessFit} pending={selected.businessStatus === 'PENDING'} onSaved={() => { void open(selected.id); router.refresh(); }} />
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
                {selected.status === 'VERIFIED' && selected.businessStatus === 'PENDING' && <form onSubmit={activate} className="space-y-5 border-t border-border pt-6">
                  <h3 className="text-lg font-semibold">Business activation</h3>
                  <p className="text-sm text-muted-foreground">Activate only after the partner agreement is reviewed. Storefront publication and payment collection remain separate.</p>
                  {!PARTNER_ACTIVATION_ROLLOUT_READY && <p className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">Activation is temporarily disabled until the shared partner/affiliate membership checks are deployed and verified.</p>}
                  {selected.review?.businessFit?.decision !== 'PILOT_APPROVED' && <p className="text-sm text-muted-foreground">Business-fit pilot approval is also required before activation.</p>}
                  <fieldset disabled={busy || !PARTNER_ACTIVATION_ROLLOUT_READY || selected.review?.businessFit?.decision !== 'PILOT_APPROVED'} className="space-y-4 disabled:opacity-60">
                    <label className="block font-medium">Partner agreement reference<input name="agreementReference" required minLength={5} maxLength={500} className={field} /></label>
                    <label className="flex items-start gap-3"><input type="checkbox" required name="agreementReviewed" className="mt-1 h-4 w-4 shrink-0 accent-primary" />I have reviewed the partner agreement and the business is ready for activation.</label>
                    <button className="min-h-11 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Activate business</button>
                  </fieldset>
                </form>}
                {selected.status === "SUBMITTED" && (
                  <form
                    aria-busy={busy}
                    onSubmit={submit}
                    className="space-y-5 border-t border-border pt-6"
                  >
                    <h3 className="text-lg font-semibold">Record review</h3>
                    <fieldset className="space-y-3">
                      <legend className="mb-2 text-sm text-muted-foreground">
                        Decision
                      </legend>
                      {[
                        ["REQUEST_CHANGES", "Request corrections"],
                        ["VERIFIED", "Accept KYC evidence"],
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
                            defaultChecked={value === "REQUEST_CHANGES"}
                            disabled={busy}
                            className="h-4 w-4 shrink-0 accent-primary focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                    <label className="block font-medium">
                      Message for the applicant
                      <textarea
                        required
                        minLength={10}
                        maxLength={2000}
                        name="message"
                        className={field}
                        rows={4}
                        disabled={busy}
                      />
                      <span className="text-sm text-muted-foreground">
                        Explain corrections or the decision. Do not include
                        internal risk notes.
                      </span>
                    </label>
                    <label className="block font-medium">
                      Internal verification evidence reference
                      <input
                        name="evidenceReference"
                        maxLength={500}
                        className={field}
                        disabled={busy}
                      />
                      <span className="text-sm text-muted-foreground">
                        Required for acceptance. Reference the checks performed;
                        do not paste BVNs or ID numbers.
                      </span>
                    </label>
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
                      {busy ? "Saving…" : "Save review decision"}
                    </button>
                  </form>
                )}
              </div>
          </section>}
        </div>
      )}
    </div>
  );
}
