import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Mail,
  MessageSquareText,
  Paperclip,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { updateIntelligenceReviewRequestAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReviewRequest = {
  pidRequest: string;
  pidUser: string;
  email: string;
  requestType: string;
  nicheName: string | null;
  supplierName: string | null;
  supplierWebsite: string | null;
  supplierContact: string | null;
  supplierAddress: string | null;
  productDetails: string | null;
  quoteDetails: string | null;
  targetQuantity: string | null;
  budgetRange: string | null;
  decisionNeeded: string | null;
  attachmentsJson: string | null;
  status: string;
  adminResponse: string | null;
  adminRecommendations: string | null;
  adminRiskLevel: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

function statusClass(status: string) {
  if (status === "answered")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "in_review")
    return "border-blue-500/20 bg-blue-500/10 text-blue-700";
  if (status === "closed")
    return "border-slate-500/20 bg-slate-100 text-slate-700";
  return "border-amber-500/20 bg-amber-500/10 text-amber-700";
}

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type ReviewAttachment = {
  name?: string;
  url?: string;
  type?: string;
  size?: number;
};

function parseAttachments(value: string | null): ReviewAttachment[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.url === "string")
      : [];
  } catch {
    return [];
  }
}

function formatFileSize(size?: number) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

const REVIEW_STATUSES = [
  "submitted",
  "in_review",
  "answered",
  "closed",
] as const;

export default async function IntelligenceReviewRequestsAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[]; status?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const first = (value: string | string[] | undefined) =>
    String(Array.isArray(value) ? value[0] || "" : value || "").trim();
  const query = first(params.q).slice(0, 160);
  const requestedStatus = first(params.status);
  const activeStatus = REVIEW_STATUSES.includes(requestedStatus as never)
    ? requestedStatus
    : "";
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const conditions = [
    ...(activeStatus ? [Prisma.sql`status = ${activeStatus}`] : []),
    ...searchTerms.map(
      (term) => Prisma.sql`LOWER(CONCAT_WS(' ',
        pidRequest, pidUser, email, requestType, nicheName, supplierName,
        supplierWebsite, supplierContact, supplierAddress, productDetails,
        quoteDetails, targetQuantity, budgetRange, decisionNeeded, status,
        adminResponse, adminRecommendations, adminRiskLevel, reviewedByName
      )) LIKE ${`%${term}%`}`,
    ),
  ];
  const searchClause = conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
  const requests = await prisma.$queryRaw<ReviewRequest[]>`
    SELECT
      pidRequest,
      pidUser,
      email,
      requestType,
      nicheName,
      supplierName,
      supplierWebsite,
      supplierContact,
      supplierAddress,
      productDetails,
      quoteDetails,
      targetQuantity,
      budgetRange,
      decisionNeeded,
      attachmentsJson,
      status,
      adminResponse,
      adminRecommendations,
      adminRiskLevel,
      reviewedByName,
      reviewedAt,
      createdAt
    FROM intelligence_review_requests
    ${searchClause}
    ORDER BY
      CASE
        WHEN status = 'submitted' THEN 1
        WHEN status = 'in_review' THEN 2
        WHEN status = 'answered' THEN 3
        ELSE 4
      END,
      createdAt DESC
    LIMIT ${query || activeStatus ? 250 : 100}
  `;

  const submittedCount = requests.filter(
    (request) => request.status === "submitted",
  ).length;
  const inReviewCount = requests.filter(
    (request) => request.status === "in_review",
  ).length;
  const answeredCount = requests.filter(
    (request) => request.status === "answered",
  ).length;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Supplier Intelligence Reviews
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review Pro customer supplier checks, quote questions and priority
            research requests.
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted/50 px-4 py-2 shadow-sm">
          <span className="text-sm font-semibold text-foreground">
            {requests.length} {query || activeStatus ? "Matching" : "Total"}{" "}
            Requests
          </span>
        </div>
      </div>

      <form className="grid gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:p-4">
        <label className="relative min-w-0">
          <span className="sr-only">Search Supplier Intelligence reviews</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search request, customer, supplier or review details…"
            className="min-h-11 w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label>
          <span className="sr-only">Filter review stage</span>
          <select
            name="status"
            defaultValue={activeStatus}
            className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All stages</option>
            {REVIEW_STATUSES.map((stage) => (
              <option key={stage} value={stage}>
                {stage.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          <Search className="h-4 w-4" /> Search
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Submitted", value: submittedCount, icon: Clock },
          { label: "In review", value: inReviewCount, icon: ShieldCheck },
          { label: "Answered", value: answeredCount, icon: CheckCircle2 },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-5 shadow-soft"
          >
            <stat.icon className="h-5 w-5 text-muted-foreground" />
            <p className="mt-4 text-2xl font-bold text-foreground">
              {stat.value}
            </p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-20 text-center shadow-soft">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            {query || activeStatus
              ? "No matching review requests"
              : "No review requests yet"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {query || activeStatus
              ? "Try a different search or select another review stage."
              : "Pro customer review requests will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((request) => (
            <ReviewRequestCard key={request.pidRequest} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewRequestCard({ request }: { request: ReviewRequest }) {
  const attachments = parseAttachments(request.attachmentsJson);

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
      <div className="border-b border-border p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${statusClass(
                  request.status,
                )}`}
              >
                {request.status.replace(/_/g, " ")}
              </span>
              <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                {request.pidRequest}
              </span>
            </div>
            <h2 className="mt-3 text-lg font-bold text-foreground">
              {request.supplierName ||
                request.nicheName ||
                "Supplier review request"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {request.requestType.replace(/_/g, " ")} •{" "}
              {formatDate(request.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`mailto:${request.email}`}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <Mail className="h-3.5 w-3.5" />
              Email customer
            </a>
            {request.supplierWebsite ? (
              <a
                href={request.supplierWebsite}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open supplier
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Customer email" value={request.email} />
            <Info label="Supplier contact" value={request.supplierContact} />
            <Info
              label="Supplier address in Chinese"
              value={request.supplierAddress}
            />
            <Info label="Quantity" value={request.targetQuantity} />
            <Info label="Budget" value={request.budgetRange} />
          </div>

          <Block
            label="Decision needed"
            value={request.decisionNeeded}
            important
          />
          <Block label="Product details" value={request.productDetails} />
          <Block label="Quote/payment details" value={request.quoteDetails} />

          {attachments.length > 0 ? (
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                Supporting files
              </p>
              <div className="mt-3 grid gap-2">
                {attachments.map((file) => (
                  <a
                    key={file.url}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    <span className="min-w-0 truncate">
                      {file.name || "Attachment"}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {request.adminResponse ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 p-4 dark:border-emerald-400/30 dark:bg-emerald-950/40">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Current response
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-emerald-950 dark:text-emerald-50">
                {request.adminResponse}
              </p>
            </div>
          ) : null}
        </div>

        <form
          action={updateIntelligenceReviewRequestAction}
          className="rounded-lg border border-border bg-background p-4"
        >
          <input type="hidden" name="pidRequest" value={request.pidRequest} />
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            Admin response
          </h3>

          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Status
            </span>
            <select
              name="status"
              defaultValue={request.status}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="submitted">Submitted</option>
              <option value="in_review">In review</option>
              <option value="answered">Answered</option>
              <option value="closed">Closed</option>
            </select>
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Risk level
            </span>
            <select
              name="adminRiskLevel"
              defaultValue={request.adminRiskLevel || ""}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Not set</option>
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
              <option value="Do not proceed yet">Do not proceed yet</option>
            </select>
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Response
            </span>
            <textarea
              name="adminResponse"
              rows={7}
              defaultValue={request.adminResponse || ""}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Give a clear assessment: what looks fine, what is missing, what the buyer must confirm."
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Recommended next steps
            </span>
            <textarea
              name="adminRecommendations"
              rows={5}
              defaultValue={request.adminRecommendations || ""}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="List what the customer should ask, verify, avoid or send back to the supplier."
            />
          </label>

          <button
            type="submit"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Save response
          </button>

          {request.status !== "answered" ? (
            <p className="mt-3 flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Customer email is sent only when status is saved as Answered.
            </p>
          ) : null}
        </form>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function Block({
  label,
  value,
  important = false,
}: {
  label: string;
  value: string | null;
  important?: boolean;
}) {
  if (!value) return null;
  return (
    <div
      className={`rounded-md border p-4 ${
        important
          ? "border-amber-500/20 bg-amber-500/10"
          : "border-border bg-background"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
        {value}
      </p>
    </div>
  );
}
