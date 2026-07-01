'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

type SupplierDraft = {
  supplierName?: string;
  productFit?: string;
  productsMade?: string[];
  suggestedCategories?: string[];
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  officialWebsite?: string;
  officialContactPage?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  countryRegion?: string;
  sourceType?: string;
  verifiedFrom?: string;
  buyerNotes?: string;
  verificationStatus?: string;
};

type DraftJson = {
  nicheName?: string;
  summary?: string;
  suppliers?: SupplierDraft[];
};

type ResearchJob = {
  pidJob: string;
  nicheName: string;
  targetSupplierCount: number;
  status: string;
  requestNotes: string | null;
  draftJson: string | null;
  errorMessage: string | null;
  sourceSearchRequestId?: string | null;
  requestedByEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
};

type SearchRequest = {
  pidSearch: string;
  pidUser: string;
  email: string;
  query: string;
  targetSupplierCount: number;
  notes: string | null;
  status: string;
  creditCost: number;
  creditReserved: boolean;
  relatedPidJob: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string | null;
};

function parseDraft(value: string | null): DraftJson | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function statusClass(status: string) {
  if (status === 'approved') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'partially_approved') return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  if (status === 'awaiting_approval') return 'border-blue-500/20 bg-blue-500/10 text-blue-700';
  if (status === 'failed' || status === 'rejected') return 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300';
  return 'border-amber-500/20 bg-amber-500/10 text-amber-700';
}

function supplierStatusClass(status: string) {
  if (status === 'approved') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'rejected') return 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300';
  return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
}

function effectiveSupplierStatus(jobStatus: string, supplier: SupplierDraft) {
  if (supplier.reviewStatus) return supplier.reviewStatus;
  if (jobStatus === 'approved') return 'approved';
  if (jobStatus === 'rejected') return 'rejected';
  return 'pending';
}

function supplierCounts(job: ResearchJob) {
  const suppliers = parseDraft(job.draftJson)?.suppliers || [];
  const statuses = suppliers.map((supplier) =>
    effectiveSupplierStatus(job.status, supplier),
  );

  return {
    total: suppliers.length,
    approved: statuses.filter((status) => status === 'approved').length,
    rejected: statuses.filter((status) => status === 'rejected').length,
    pending: statuses.filter((status) => status === 'pending').length,
  };
}

function progressMessage(actionKey: string | null, pidJob: string) {
  if (!actionKey?.startsWith(`${pidJob}:`)) return '';
  const [, action] = actionKey.split(':');

  if (action === 'approve') return 'Approving pending suppliers and publishing records...';
  if (action === 'reject') return 'Rejecting this research job...';
  if (action === 'approve_supplier') return 'Approving and publishing this supplier...';
  if (action === 'reject_supplier') return 'Rejecting this supplier...';
  if (action === 'unapprove_supplier') return 'Unapproving this supplier and removing it from the published database...';
  return 'Updating research job...';
}

export default function IntelligenceResearchAgent() {
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [searchRequests, setSearchRequests] = useState<SearchRequest[]>([]);
  const [nicheName, setNicheName] = useState('');
  const [targetSupplierCount, setTargetSupplierCount] = useState(3);
  const [requestNotes, setRequestNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningSearchRequest, setRunningSearchRequest] = useState<string | null>(null);
  const [updatingJob, setUpdatingJob] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});

  const awaitingCount = useMemo(
    () => jobs.filter((job) => job.status === 'awaiting_approval').length,
    [jobs],
  );

  const loadJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/intelligence/research', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load research jobs.');
      }
      const nextJobs = data.data || [];
      setJobs(nextJobs);
      setSearchRequests(data.searchRequests || []);
      setExpandedJobs((current) => {
        const next = { ...current };
        for (const job of nextJobs as ResearchJob[]) {
          if (job.status === 'awaiting_approval' && job.sourceSearchRequestId) {
            next[job.pidJob] = true;
          }
        }
        return next;
      });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load research jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const runResearch = async () => {
    if (!nicheName.trim()) {
      toast.error('Enter a niche name first.');
      return;
    }

    setRunning(true);
    const toastId = toast.loading('Research agent is checking supplier candidates...');
    try {
      const response = await fetch('/api/intelligence/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nicheName,
          targetSupplierCount,
          requestNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Research failed.');
      }
      setJobs(data.data || []);
      setSearchRequests(data.searchRequests || []);
      setNicheName('');
      setRequestNotes('');
      toast.success('Research draft created. Review before approval.', { id: toastId });
    } catch (error: any) {
      toast.error(error?.message || 'Research failed.', { id: toastId });
      await loadJobs();
    } finally {
      setRunning(false);
    }
  };

  const runSearchRequestResearch = async (sourceSearchRequestId: string) => {
    setRunningSearchRequest(sourceSearchRequestId);
    const toastId = toast.loading('Research agent is working on the user search request...');
    try {
      const response = await fetch('/api/intelligence/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceSearchRequestId }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Research failed.');
      }
      setJobs(data.data || []);
      setSearchRequests(data.searchRequests || []);
      toast.success('User search draft created. Review before approval.', {
        id: toastId,
      });
    } catch (error: any) {
      toast.error(error?.message || 'Research failed.', { id: toastId });
      await loadJobs();
    } finally {
      setRunningSearchRequest(null);
    }
  };

  const updateJob = async (
    pidJob: string,
    action:
      | 'approve'
      | 'reject'
      | 'approve_supplier'
      | 'reject_supplier'
      | 'unapprove_supplier',
    supplierIndex?: number,
  ) => {
    setUpdatingJob(`${pidJob}:${action}:${supplierIndex ?? 'job'}`);
    try {
      const response = await fetch('/api/intelligence/research', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pidJob, action, supplierIndex }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Update failed.');
      }
      setJobs(data.data || []);
      setSearchRequests(data.searchRequests || []);
      toast.success(
        action === 'approve'
          ? 'Research approved and published.'
          : action === 'reject'
            ? 'Research rejected.'
            : action === 'approve_supplier'
              ? 'Supplier approved and published.'
              : action === 'reject_supplier'
                ? 'Supplier rejected.'
                : 'Supplier unapproved and removed from published supplier access.',
      );
    } catch (error: any) {
      toast.error(error?.message || 'Update failed.');
    } finally {
      setUpdatingJob(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              <Bot className="h-3.5 w-3.5" />
              Draft first, approve later
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground">
              Request supplier research
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The agent creates a research draft for specialist review. Customers
              may see a blurred preview while Sure Imports checks the result,
              but full supplier details are only released after admin approval.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm font-bold text-foreground">
            {awaitingCount} awaiting approval
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_180px]">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Niche / product category
            </span>
            <input
              value={nicheName}
              onChange={(event) => setNicheName(event.target.value)}
              placeholder="Example: Salon equipment for Nigerian beauty businesses"
              className="mt-2 w-full rounded-md border border-input bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Suppliers
            </span>
            <select
              value={targetSupplierCount}
              onChange={(event) => setTargetSupplierCount(Number(event.target.value))}
              className="mt-2 w-full rounded-md border border-input bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={3}>3 suppliers</option>
              <option value={4}>4 suppliers</option>
              <option value={5}>5 suppliers</option>
              <option value={6}>6 suppliers</option>
              <option value={7}>7 suppliers</option>
              <option value={8}>8 suppliers</option>
              <option value={9}>9 suppliers</option>
              <option value={10}>10 suppliers</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Research notes
          </span>
          <textarea
            value={requestNotes}
            onChange={(event) => setRequestNotes(event.target.value)}
            rows={4}
            placeholder="Add buyer type, target products, quality expectations, country restrictions or supplier types to avoid."
            className="mt-2 w-full resize-none rounded-md border border-input bg-background px-4 py-3 text-sm font-medium leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={runResearch}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {running ? 'Researching...' : 'Generate research draft'}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              User Search Requests
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Freemium and Pro search-credit requests. Generate a draft, then
              approve suppliers before publishing.
            </p>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            {searchRequests.filter((request) => request.status === 'awaiting_admin').length} pending
          </span>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading user search requests...
          </div>
        ) : searchRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No user search requests yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {searchRequests.map((request) => (
              <SearchRequestCard
                key={request.pidSearch}
                request={request}
                relatedJob={jobs.find((job) => job.pidJob === request.relatedPidJob)}
                running={runningSearchRequest === request.pidSearch}
                onGenerate={() => runSearchRequestResearch(request.pidSearch)}
                onReviewJob={
                  request.relatedPidJob
                    ? () => {
                        setExpandedJobs((current) => ({
                          ...current,
                          [request.relatedPidJob as string]: true,
                        }));
                        document
                          .getElementById(`research-job-${request.relatedPidJob}`)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-foreground">Research Jobs</h2>
          <button
            type="button"
            onClick={loadJobs}
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Loading research jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No supplier research jobs yet.
          </div>
        ) : (
          <div className="space-y-5">
            {jobs.map((job) => (
              <ResearchJobCard
                key={job.pidJob}
                job={job}
                expanded={Boolean(expandedJobs[job.pidJob])}
                updatingJob={updatingJob}
                onToggle={() =>
                  setExpandedJobs((current) => ({
                    ...current,
                    [job.pidJob]: !current[job.pidJob],
                  }))
                }
                onApprove={() => updateJob(job.pidJob, 'approve')}
                onReject={() => updateJob(job.pidJob, 'reject')}
                onApproveSupplier={(supplierIndex) =>
                  updateJob(job.pidJob, 'approve_supplier', supplierIndex)
                }
                onRejectSupplier={(supplierIndex) =>
                  updateJob(job.pidJob, 'reject_supplier', supplierIndex)
                }
                onUnapproveSupplier={(supplierIndex) =>
                  updateJob(job.pidJob, 'unapprove_supplier', supplierIndex)
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SearchRequestCard({
  request,
  relatedJob,
  running,
  onGenerate,
  onReviewJob,
}: {
  request: SearchRequest;
  relatedJob?: ResearchJob;
  running: boolean;
  onGenerate: () => void;
  onReviewJob?: () => void;
}) {
  const canGenerate = request.status === 'awaiting_admin' && !request.relatedPidJob;
  const relatedCounts = relatedJob ? supplierCounts(relatedJob) : null;

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClass(
                request.status,
              )}`}
            >
              {request.status.replace(/_/g, ' ')}
            </span>
            <span className="font-mono text-[10px] font-bold text-muted-foreground">
              {request.pidSearch}
            </span>
          </div>
          <h3 className="mt-3 text-base font-bold text-foreground">
            {request.query}
          </h3>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>{request.targetSupplierCount} suppliers</span>
            <span>{request.creditCost} credit used</span>
            <span>{request.email}</span>
          </div>
          {request.notes ? (
            <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {request.notes}
            </p>
          ) : null}
          {request.adminNotes ? (
            <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-300">
              {request.adminNotes}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          {request.relatedPidJob ? (
            <span className="rounded-md border border-border px-3 py-2 text-center text-xs font-bold text-muted-foreground">
              Job: {request.relatedPidJob}
            </span>
          ) : null}
          {relatedJob?.draftJson ? (
            <button
              type="button"
              onClick={onReviewJob}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Review suppliers
            </button>
          ) : null}
          {canGenerate ? (
            <button
              type="button"
              onClick={onGenerate}
              disabled={running}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
              {running ? 'Generating...' : 'Generate draft'}
            </button>
          ) : null}
        </div>
      </div>

      {running ? (
        <div className="mt-4 overflow-hidden rounded-md border border-primary/20 bg-primary/10">
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Researching suppliers and preparing an admin review draft...</span>
          </div>
          <div className="h-1 overflow-hidden bg-primary/10">
            <div className="h-full w-1/3 animate-[research-progress_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
          </div>
          <style jsx>{`
            @keyframes research-progress {
              0% {
                transform: translateX(-120%);
              }
              100% {
                transform: translateX(320%);
              }
            }
          `}</style>
        </div>
      ) : null}

      {relatedJob?.draftJson && relatedCounts ? (
        <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">
                Supplier draft ready for admin review
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {relatedCounts.total} suppliers fetched • {relatedCounts.pending} pending • {relatedCounts.approved} approved • {relatedCounts.rejected} rejected
              </p>
            </div>
            <button
              type="button"
              onClick={onReviewJob}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-blue-500/20 bg-background px-3 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
            >
              Open approval list
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ResearchJobCard({
  job,
  expanded,
  updatingJob,
  onToggle,
  onApprove,
  onReject,
  onApproveSupplier,
  onRejectSupplier,
  onUnapproveSupplier,
}: {
  job: ResearchJob;
  expanded: boolean;
  updatingJob: string | null;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onApproveSupplier: (supplierIndex: number) => void;
  onRejectSupplier: (supplierIndex: number) => void;
  onUnapproveSupplier: (supplierIndex: number) => void;
}) {
  const draft = parseDraft(job.draftJson);
  const suppliers = draft?.suppliers || [];
  const counts = supplierCounts(job);
  const jobUpdating = Boolean(updatingJob?.startsWith(`${job.pidJob}:`));
  const activeProgressMessage = progressMessage(updatingJob, job.pidJob);
  const canReview = ['awaiting_approval', 'partially_approved'].includes(job.status);

  return (
    <article id={`research-job-${job.pidJob}`} className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-muted/30 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex min-w-0 gap-3">
          <div className="mt-1 text-muted-foreground">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClass(job.status)}`}>
                {job.status.replace(/_/g, ' ')}
              </span>
              <span className="font-mono text-[10px] font-bold text-muted-foreground">
                {job.pidJob}
              </span>
            </div>
            <h3 className="mt-3 truncate text-lg font-bold text-foreground">
              {draft?.nicheName || job.nicheName}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>{counts.total} suppliers</span>
              <span>{counts.approved} approved</span>
              <span>{counts.rejected} rejected</span>
              <span>{counts.pending} pending</span>
            </div>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-border p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              {draft?.summary ? (
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {draft.summary}
                </p>
              ) : null}
            </div>

            {canReview ? (
              <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onReject}
              disabled={jobUpdating}
              className="inline-flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-500/15 disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-500/20"
            >
              {updatingJob === `${job.pidJob}:reject:job` ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {updatingJob === `${job.pidJob}:reject:job` ? 'Rejecting...' : 'Reject job'}
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={jobUpdating}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {updatingJob === `${job.pidJob}:approve:job` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {updatingJob === `${job.pidJob}:approve:job` ? 'Approving...' : 'Approve pending'}
            </button>
              </div>
            ) : null}
          </div>

          {activeProgressMessage ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-primary/20 bg-primary/10">
              <div className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{activeProgressMessage}</span>
              </div>
              <div className="h-1.5 overflow-hidden bg-primary/10">
                <div className="h-full w-1/3 animate-[research-progress_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
              </div>
              <style jsx>{`
                @keyframes research-progress {
                  0% {
                    transform: translateX(-120%);
                  }
                  100% {
                    transform: translateX(320%);
                  }
                }
              `}</style>
            </div>
          ) : null}

      {job.errorMessage ? (
        <div className="mt-4 flex gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{job.errorMessage}</p>
        </div>
      ) : null}

      {suppliers.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {suppliers.map((supplier, index) => (
            (() => {
              const reviewStatus = effectiveSupplierStatus(job.status, supplier);
              const supplierUpdating =
                updatingJob === `${job.pidJob}:approve_supplier:${index}` ||
                updatingJob === `${job.pidJob}:reject_supplier:${index}` ||
                updatingJob === `${job.pidJob}:unapprove_supplier:${index}`;
              return (
            <div
              key={`${supplier.supplierName}-${supplier.officialWebsite}-${index}`}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${supplierStatusClass(reviewStatus)}`}>
                      {reviewStatus}
                    </span>
                  </div>
                  <h4 className="font-bold text-foreground">
                    {supplier.supplierName || 'Unnamed supplier'}
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {supplier.productFit}
                  </p>
                  {Array.isArray(supplier.productsMade) && supplier.productsMade.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {supplier.productsMade.map((product) => (
                        <span
                          key={product}
                          className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
                        >
                          {product}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {Array.isArray(supplier.suggestedCategories) && supplier.suggestedCategories.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Also list under
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {supplier.suggestedCategories.map((category) => (
                          <span
                            key={category}
                            className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                  {supplier.officialWebsite ? (
                    <a
                      href={supplier.officialWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      Website
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  {canReview && supplier.reviewStatus !== 'approved' ? (
                    <button
                      type="button"
                      onClick={() => onApproveSupplier(index)}
                      disabled={jobUpdating}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      {updatingJob === `${job.pidJob}:approve_supplier:${index}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                  ) : null}
                  {reviewStatus === 'approved' ? (
                    <button
                      type="button"
                      onClick={() => onUnapproveSupplier(index)}
                      disabled={jobUpdating}
                      className="inline-flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-500/15 disabled:opacity-60 dark:text-amber-300 dark:hover:bg-amber-500/20"
                    >
                      {updatingJob === `${job.pidJob}:unapprove_supplier:${index}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      {updatingJob === `${job.pidJob}:unapprove_supplier:${index}`
                        ? 'Unapproving...'
                        : 'Unapprove'}
                    </button>
                  ) : null}
                  {canReview && supplier.reviewStatus !== 'rejected' ? (
                    <button
                      type="button"
                      onClick={() => onRejectSupplier(index)}
                      disabled={jobUpdating}
                      className="inline-flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-500/15 disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-500/20"
                    >
                      {updatingJob === `${job.pidJob}:reject_supplier:${index}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {updatingJob === `${job.pidJob}:reject_supplier:${index}` ? 'Rejecting...' : 'Reject'}
                    </button>
                  ) : null}
                </div>
              </div>

              {supplierUpdating ? (
                <div className="mt-4 overflow-hidden rounded-md border border-primary/20 bg-primary/10">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{progressMessage(updatingJob, job.pidJob)}</span>
                  </div>
                  <div className="h-1 overflow-hidden bg-primary/10">
                    <div className="h-full w-1/3 animate-[research-progress_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Info label="Contact page" value={supplier.officialContactPage} />
                <Info label="Region" value={supplier.countryRegion} />
                <Info label="Email" value={supplier.email} />
                <Info label="Phone" value={supplier.phone} />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <Block label="Verification summary" value={supplier.verifiedFrom} />
                <Block label="Buyer notes" value={supplier.buyerNotes} />
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                {supplier.verificationStatus || 'pending review'}
              </div>
            </div>
              );
            })()
          ))}
        </div>
      ) : null}
        </div>
      ) : null}
    </article>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function Block({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
        {value}
      </p>
    </div>
  );
}
