import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Link2,
  ListChecks,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react"

import { isSuperAdminStatus } from "@/lib/accessControl"
import { verifyToken } from "@/lib/jwt"
import { prisma } from "@/lib/prisma"
import {
  applySeoMetadataChange,
  getSeoChangeReview,
  rejectSeoChange,
} from "@/lib/seo/changeReview"
import ApplyDraftButton from "../../components/ApplyDraftButton"

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

async function applyMetadataAction(formData: FormData) {
  "use server"

  await requireSuperAdminPageAccess()
  const pidChange = String(formData.get("pidChange") || "").trim()
  if (!pidChange) return

  let nextUrl = `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?applied=draft`
  try {
    await applySeoMetadataChange(pidChange)
    revalidatePath("/dashboard/marketing/seo")
    revalidatePath(`/dashboard/marketing/seo/changes/${pidChange}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not apply SEO draft."
    nextUrl = `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?error=${encodeURIComponent(message)}`
  }

  redirect(nextUrl)
}

async function rejectDraftAction(formData: FormData) {
  "use server"

  await requireSuperAdminPageAccess()
  const pidChange = String(formData.get("pidChange") || "").trim()
  if (!pidChange) return

  await rejectSeoChange(pidChange)
  revalidatePath("/dashboard/marketing/seo")
  revalidatePath(`/dashboard/marketing/seo/changes/${pidChange}`)
  redirect(`/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?rejected=1`)
}

function formatDate(value?: Date | null) {
  if (!value) return "Unknown"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value)
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
  if (status === "applied") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
  if (status === "rejected") return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300"
  return "border-amber-500/20 bg-amber-500/10 text-amber-700"
}

function JsonList({ items }: { items: unknown }) {
  const list = Array.isArray(items) ? items : []
  if (list.length === 0) {
    return <p className="text-xs text-muted-foreground">No items proposed.</p>
  }

  return (
    <div className="space-y-3">
      {list.map((item, index) => (
        <div key={index} className="rounded-lg border border-border bg-background p-4">
          {typeof item === "string" ? (
            <p className="text-sm leading-relaxed text-foreground">{item}</p>
          ) : (
            <div className="space-y-2">
              {Object.entries((item || {}) as Record<string, unknown>).map(([key, value]) => (
                <div key={key}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    {key.replace(/([A-Z])/g, " $1")}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{String(value || "")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function FieldPreview({
  label,
  value,
  note,
}: {
  label: string
  value: unknown
  note?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        {note && <span className="font-mono text-[10px] text-muted-foreground">{note}</span>}
      </div>
      <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">{String(value || "Not provided")}</p>
    </div>
  )
}

export default async function SeoChangeReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ pidChange: string }>
  searchParams?: Promise<{ applied?: string; rejected?: string; error?: string }>
}) {
  await requireSuperAdminPageAccess()

  const { pidChange } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const change = await getSeoChangeReview(pidChange)
  if (!change) notFound()

  const after = change.after || {}
  const validation = change.validation || {}
  const validationErrors = Array.isArray(validation.errors) ? validation.errors : []
  const validationWarnings = Array.isArray(validation.warnings) ? validation.warnings : []
  const editHref = change.pidBlog ? `/dashboard/blog/edit?pidBlog=${encodeURIComponent(change.pidBlog)}` : "/dashboard/blog/view"

  return (
    <main className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard/marketing/seo?status=reviewing"
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            SEO Queue
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClass(change.status)}`}>
              {change.status}
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              {change.changeType.replace(/_/g, " ")}
            </span>
            <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              CTA: {ctaLabel(change.recommendedCta)}
            </span>
          </div>
          <h1 className="mt-4 max-w-4xl text-2xl font-bold tracking-tight text-foreground">
            {change.blogTitle || "SEO Draft Review"}
          </h1>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground break-all">
            {change.pageUrl || change.blogSlug || change.pidChange}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={editHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted"
          >
            Edit Blog <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          {change.pageUrl && (
            <a
              href={change.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted"
            >
              Public Page <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
          {change.status !== "rejected" && (
            <>
              {change.status !== "applied" && (
                <form action={rejectDraftAction}>
                  <input type="hidden" name="pidChange" value={change.pidChange} />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-700 hover:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/20"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </form>
              )}
              <form action={applyMetadataAction}>
                <input type="hidden" name="pidChange" value={change.pidChange} />
                <ApplyDraftButton label={change.status === "applied" ? "Reapply Draft" : "Apply Draft"} />
              </form>
            </>
          )}
        </div>
      </div>

      {resolvedSearchParams.applied && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-700">
          SEO metadata, content brief recommendations and FAQ section were applied to the blog post.
        </div>
      )}
      {resolvedSearchParams.rejected && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300">
          SEO draft was rejected.
        </div>
      )}
      {resolvedSearchParams.error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300">
          {resolvedSearchParams.error}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Generated
          </p>
          <p className="mt-3 text-sm font-bold text-foreground">{formatDate(change.createdAt)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Validation
          </p>
          <p className="mt-3 text-sm font-bold text-foreground">
            {validation.ok ? "Passed rules" : `${validationErrors.length} issue(s)`}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Search Query
          </p>
          <p className="mt-3 text-sm font-bold text-foreground">{change.primaryQuery || "Unknown"}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-sm font-bold text-foreground">Metadata To Apply</h2>
            <div className="mt-4 grid gap-4">
              <FieldPreview
                label="Meta Title"
                value={after.metaTitle}
                note={`${String(after.metaTitle || "").length}/65`}
              />
              <FieldPreview
                label="Meta Description"
                value={after.metaDescription}
                note={`${String(after.metaDescription || "").length}/160`}
              />
              <FieldPreview label="Focus Keyword" value={after.focusKeyword} />
              <FieldPreview label="CTA Intent" value={after.ctaIntent} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <ListChecks className="h-4 w-4 text-primary" />
              FAQ Suggestions
            </h2>
            <div className="mt-4">
              <JsonList items={after.faq} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Link2 className="h-4 w-4 text-primary" />
              Internal Link Suggestions
            </h2>
            <div className="mt-4">
              <JsonList items={after.internalLinks} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-sm font-bold text-foreground">Content Brief</h2>
            <div className="mt-4">
              <JsonList items={after.contentBrief} />
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-sm font-bold text-foreground">Opportunity</h2>
            <div className="mt-4 space-y-4 text-xs leading-relaxed text-muted-foreground">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest">Type</p>
                <p className="mt-1 font-bold text-foreground">{change.opportunityType?.replace(/_/g, " ") || "Unknown"}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest">Recommendation</p>
                <p className="mt-1">{change.recommendation || "No recommendation stored."}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-sm font-bold text-foreground">Validation Notes</h2>
            <div className="mt-4 space-y-3">
              {validationErrors.length === 0 && validationWarnings.length === 0 ? (
                <p className="text-xs text-muted-foreground">No validation issues were stored for this draft.</p>
              ) : (
                <>
                  <JsonList items={validationErrors} />
                  <JsonList items={validationWarnings} />
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-sm font-bold text-foreground">Risk Notes</h2>
            <div className="mt-4">
              <JsonList items={after.riskNotes} />
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}
