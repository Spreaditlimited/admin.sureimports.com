import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Sparkles,
  FileText,
  Lightbulb,
  Search,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react"

import { isSuperAdminStatus } from "@/lib/accessControl"
import { verifyToken } from "@/lib/jwt"
import { prisma } from "@/lib/prisma"
import { generateSeoDraftForOpportunity } from "@/lib/seo/opportunityDrafts"
import GenerateDraftButton from "./components/GenerateDraftButton"

type OpportunityStatus = "open" | "reviewing" | "dismissed" | "applied"
type OpportunityType = "all" | "low_ctr" | "ranking_push"

interface SeoOpportunity {
  pidOpportunity: string
  pageUrl: string
  blogSlug: string | null
  blogTitle: string | null
  pidBlog: string | null
  opportunityType: string
  primaryQuery: string | null
  clicks: number
  impressions: number
  ctr: unknown
  position: unknown
  confidence: unknown
  status: string
  recommendation: string | null
  recommendedCta: string | null
  sourceStartDate: Date | null
  sourceEndDate: Date | null
  latestChangeId: string | null
  latestChangeStatus: string | null
  latestChangeCreatedAt: Date | null
  createdAt: Date | null
}

interface OpportunityStats {
  totalOpen: bigint | number
  totalReviewing: bigint | number
  totalDismissed: bigint | number
  importedRows: bigint | number
  latestImportAt: Date | null
}

const statusOptions: Array<{ label: string; value: OpportunityStatus | "all" }> = [
  { label: "Open", value: "open" },
  { label: "Reviewing", value: "reviewing" },
  { label: "Dismissed", value: "dismissed" },
  { label: "All", value: "all" },
]

const typeOptions: Array<{ label: string; value: OpportunityType }> = [
  { label: "All Types", value: "all" },
  { label: "Low CTR", value: "low_ctr" },
  { label: "Ranking Push", value: "ranking_push" },
]

async function requireSuperAdminPageAccess() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  if (!token) redirect("/auth/login")

  const payload = verifyToken(token) as { pidUser?: string } | null
  if (!payload?.pidUser) redirect("/auth/login")

  const admin = await prisma.admin.findUnique({
    where: { pidUser: payload.pidUser },
    select: { userStatus: true },
  })

  if (!admin || !isSuperAdminStatus(admin.userStatus)) {
    redirect("/dashboard")
  }
}

async function updateOpportunityStatus(formData: FormData) {
  "use server"

  await requireSuperAdminPageAccess()

  const pidOpportunity = String(formData.get("pidOpportunity") || "").trim()
  const nextStatus = String(formData.get("status") || "").trim() as OpportunityStatus
  const allowed: OpportunityStatus[] = ["open", "reviewing", "dismissed", "applied"]

  if (!pidOpportunity || !allowed.includes(nextStatus)) return

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE seo_opportunities
      SET status = ${nextStatus},
          updatedAt = ${new Date()}
      WHERE pidOpportunity = ${pidOpportunity}
    `,
  )

  revalidatePath("/dashboard/marketing/seo")
}

async function generateDraftAction(formData: FormData) {
  "use server"

  await requireSuperAdminPageAccess()

  const pidOpportunity = String(formData.get("pidOpportunity") || "").trim()
  if (!pidOpportunity) return

  const [existingDraft] = await prisma.$queryRaw<Array<{ pidChange: string; status: string }>>(
    Prisma.sql`
      SELECT pidChange, status
      FROM seo_content_change_logs
      WHERE pidOpportunity = ${pidOpportunity}
      ORDER BY createdAt DESC
      LIMIT 1
    `,
  )

  if (existingDraft?.pidChange && existingDraft.status !== "rejected") {
    redirect(`/dashboard/marketing/seo/changes/${encodeURIComponent(existingDraft.pidChange)}`)
  }

  let nextUrl = "/dashboard/marketing/seo?status=reviewing&draft=created"
  try {
    const result = await generateSeoDraftForOpportunity(pidOpportunity)
    revalidatePath("/dashboard/marketing/seo")
    nextUrl = `/dashboard/marketing/seo/changes/${encodeURIComponent(result.pidChange)}?draft=created`
  } catch (error) {
    const message = error instanceof Error ? error.message : "Draft generation failed."
    nextUrl = `/dashboard/marketing/seo?draftError=${encodeURIComponent(message)}`
  }

  redirect(nextUrl)
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0))
}

function formatPercent(value: unknown) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`
}

function formatPosition(value: unknown) {
  return Number(value || 0).toFixed(1)
}

function formatDate(value?: Date | null) {
  if (!value) return "Unknown"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value)
}

function typeLabel(value: string) {
  if (value === "low_ctr") return "Low CTR"
  if (value === "ranking_push") return "Ranking Push"
  return value.replace(/_/g, " ")
}

function ctaLabel(value?: string | null) {
  if (!value) return "General procurement"
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function statusClass(status: string) {
  if (status === "reviewing") return "border-blue-500/20 bg-blue-500/10 text-blue-600"
  if (status === "dismissed") return "border-slate-500/20 bg-slate-500/10 text-slate-500"
  if (status === "applied") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
  return "border-amber-500/20 bg-amber-500/10 text-amber-600"
}

function opportunityIcon(type: string) {
  if (type === "low_ctr") return Target
  if (type === "ranking_push") return TrendingUp
  return Lightbulb
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string
  value: unknown
  note: string
  icon: any
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-foreground">{formatNumber(value)}</p>
        </div>
        <div className="shrink-0 rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 border-t border-border/50 pt-3 text-[10px] leading-relaxed text-muted-foreground">
        {note}
      </p>
    </div>
  )
}

async function getSeoOpportunities(input: {
  status: OpportunityStatus | "all"
  type: OpportunityType
}) {
  const statusFilter = input.status === "all" ? null : input.status
  const typeFilter = input.type === "all" ? null : input.type

  const [statsRows, opportunityRows] = await Promise.all([
    prisma.$queryRaw<OpportunityStats[]>(
      Prisma.sql`
        SELECT
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS totalOpen,
          SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) AS totalReviewing,
          SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) AS totalDismissed,
          (SELECT COUNT(*) FROM search_console_query_stats) AS importedRows,
          (SELECT completedAt FROM search_console_import_runs WHERE status = 'completed' ORDER BY completedAt DESC LIMIT 1) AS latestImportAt
        FROM seo_opportunities
      `,
    ),
    prisma.$queryRaw<SeoOpportunity[]>(
      Prisma.sql`
        SELECT
          o.pidOpportunity,
          o.pageUrl,
          o.blogSlug,
          b.pidBlog,
          b.blogTitle,
          o.opportunityType,
          o.primaryQuery,
          o.clicks,
          o.impressions,
          o.ctr,
          o.position,
          o.confidence,
          o.status,
          o.recommendation,
          o.recommendedCta,
          o.sourceStartDate,
          o.sourceEndDate,
          (
            SELECT c.pidChange
            FROM seo_content_change_logs c
            WHERE c.pidOpportunity = o.pidOpportunity
            ORDER BY c.createdAt DESC
            LIMIT 1
          ) AS latestChangeId,
          (
            SELECT c.status
            FROM seo_content_change_logs c
            WHERE c.pidOpportunity = o.pidOpportunity
            ORDER BY c.createdAt DESC
            LIMIT 1
          ) AS latestChangeStatus,
          (
            SELECT c.createdAt
            FROM seo_content_change_logs c
            WHERE c.pidOpportunity = o.pidOpportunity
            ORDER BY c.createdAt DESC
            LIMIT 1
          ) AS latestChangeCreatedAt,
          o.createdAt
        FROM seo_opportunities o
        LEFT JOIN blog b ON b.blogSlug = o.blogSlug
        WHERE (${statusFilter} IS NULL OR o.status = ${statusFilter})
          AND (${typeFilter} IS NULL OR o.opportunityType = ${typeFilter})
        ORDER BY o.confidence DESC, o.impressions DESC, o.createdAt DESC
        LIMIT 100
      `,
    ),
  ])

  return {
    stats: statsRows[0] || {
      totalOpen: 0,
      totalReviewing: 0,
      totalDismissed: 0,
      importedRows: 0,
      latestImportAt: null,
    },
    opportunities: opportunityRows,
  }
}

export default async function SeoOpportunitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; type?: string; draft?: string; draftError?: string }>
}) {
  await requireSuperAdminPageAccess()

  const resolvedSearchParams = searchParams ? await searchParams : {}
  const status = (resolvedSearchParams.status || "open") as OpportunityStatus | "all"
  const type = (resolvedSearchParams.type || "all") as OpportunityType
  const draftError = resolvedSearchParams.draftError
  const draftCreated = resolvedSearchParams.draft === "created"
  const { stats, opportunities } = await getSeoOpportunities({ status, type })

  return (
    <main className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 border-b border-border px-1 pb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Search Console Opportunities</h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              SEO automation queue from SureImports search demand
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statusOptions.map((option) => (
            <Link
              key={option.value}
              href={`/dashboard/marketing/seo?status=${option.value}&type=${type}`}
              className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                status === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      {draftCreated && (
        <div className="mx-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-700">
          SEO draft created and moved to editorial review.
        </div>
      )}

      {draftError && (
        <div className="mx-1 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300">
          {draftError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 px-1 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Open Opportunities"
          value={stats.totalOpen}
          note="Items ready for review, drafting, or safe metadata improvement."
          icon={Lightbulb}
        />
        <MetricCard
          label="Reviewing"
          value={stats.totalReviewing}
          note="Items marked for editorial attention before automation proceeds."
          icon={Activity}
        />
        <MetricCard
          label="Imported GSC Rows"
          value={stats.importedRows}
          note={`Latest completed import: ${formatDate(stats.latestImportAt)}.`}
          icon={BarChart3}
        />
        <MetricCard
          label="Dismissed"
          value={stats.totalDismissed}
          note="Search opportunities intentionally removed from the active queue."
          icon={XCircle}
        />
      </div>

      <div className="mx-1 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Opportunity Type</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Filter low-CTR metadata fixes separately from content expansion opportunities.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((option) => (
            <Link
              key={option.value}
              href={`/dashboard/marketing/seo?status=${status}&type=${option.value}`}
              className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                type === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="mx-1 overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="flex flex-col gap-2 border-b border-border bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Editorial Opportunity Queue
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Showing {opportunities.length} records
          </span>
        </div>

        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <AlertTriangle className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <h3 className="text-sm font-bold text-foreground">No opportunities in this filter</h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              Run a wider Search Console import or switch filters to inspect previously dismissed and reviewed items.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {opportunities.map((opportunity) => {
              const Icon = opportunityIcon(opportunity.opportunityType)
              const editHref = opportunity.pidBlog
                ? `/dashboard/blog/edit?pidBlog=${encodeURIComponent(opportunity.pidBlog)}`
                : `/dashboard/blog/view?search=${encodeURIComponent(opportunity.blogSlug || opportunity.primaryQuery || "")}`

              return (
                <article key={opportunity.pidOpportunity} className="p-6 transition-colors hover:bg-muted/20">
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                          <Icon className="h-3 w-3" />
                          {typeLabel(opportunity.opportunityType)}
                        </span>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClass(opportunity.status)}`}>
                          {opportunity.status}
                        </span>
                        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          CTA: {ctaLabel(opportunity.recommendedCta)}
                        </span>
                        {opportunity.latestChangeId && opportunity.latestChangeStatus !== "rejected" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                            <Sparkles className="h-3 w-3" />
                            Draft {opportunity.latestChangeStatus || "saved"}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-lg font-bold leading-tight text-foreground">
                        {opportunity.blogTitle || opportunity.blogSlug || "Unmatched blog page"}
                      </h3>
                      <p className="mt-2 font-mono text-[11px] text-muted-foreground break-all">
                        {opportunity.pageUrl}
                      </p>

                      <div className="mt-4 rounded-lg border border-border bg-background p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Search Query</p>
                        <p className="mt-1 text-sm font-bold text-foreground">{opportunity.primaryQuery || "Unknown query"}</p>
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                          {opportunity.recommendation || "Review this query and decide whether to refresh the article."}
                        </p>
                      </div>
                    </div>

                    <aside className="space-y-4 rounded-xl border border-border bg-background p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Clicks</p>
                          <p className="mt-1 font-mono text-lg font-bold text-foreground">{formatNumber(opportunity.clicks)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Impressions</p>
                          <p className="mt-1 font-mono text-lg font-bold text-foreground">{formatNumber(opportunity.impressions)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">CTR</p>
                          <p className="mt-1 font-mono text-lg font-bold text-foreground">{formatPercent(opportunity.ctr)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Position</p>
                          <p className="mt-1 font-mono text-lg font-bold text-foreground">{formatPosition(opportunity.position)}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-card p-3">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Confidence</p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, Math.max(4, Number(opportunity.confidence || 0) * 100))}%` }}
                          />
                        </div>
                        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                          {(Number(opportunity.confidence || 0) * 100).toFixed(1)}%
                        </p>
                      </div>

                      {opportunity.latestChangeCreatedAt && (
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-700">Latest Draft</p>
                          <p className="mt-1 text-[11px] text-emerald-700">
                            {opportunity.latestChangeStatus || "draft"} on {formatDate(opportunity.latestChangeCreatedAt)}
                          </p>
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Link
                          href={editHref}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted"
                        >
                          Edit Blog <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>

                        <a
                          href={opportunity.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted"
                        >
                          Public Page <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>

                        {opportunity.latestChangeId && opportunity.latestChangeStatus !== "rejected" && (
                          <Link
                            href={`/dashboard/marketing/seo/changes/${encodeURIComponent(opportunity.latestChangeId)}`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700 hover:bg-emerald-500/15"
                          >
                            Review Draft <Sparkles className="h-3.5 w-3.5" />
                          </Link>
                        )}

                        <form action={updateOpportunityStatus} className={opportunity.status === "reviewing" ? "grid gap-2" : "grid grid-cols-2 gap-2"}>
                          <input type="hidden" name="pidOpportunity" value={opportunity.pidOpportunity} />
                          {opportunity.status !== "reviewing" && (
                            <button
                              type="submit"
                              name="status"
                              value="reviewing"
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:bg-blue-500/15"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Mark for Review
                            </button>
                          )}
                          <button
                            type="submit"
                            name="status"
                            value="dismissed"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-500/20 bg-slate-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-500/15"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Dismiss
                          </button>
                        </form>

                        {(!opportunity.latestChangeId || opportunity.latestChangeStatus === "rejected") && (
                          <form action={generateDraftAction}>
                            <input type="hidden" name="pidOpportunity" value={opportunity.pidOpportunity} />
                            <GenerateDraftButton />
                          </form>
                        )}
                      </div>
                    </aside>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
