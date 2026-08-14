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
  ShieldAlert,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react"

import { isSuperAdminStatus } from "@/lib/accessControl"
import { verifyToken } from "@/lib/jwt"
import { prisma } from "@/lib/prisma"
import {
  applySeoMetadataChange,
  approveSeoRewriteLink,
  discardSeoRewrite,
  getSeoChangeReview,
  prepareSeoRewrite,
  rejectSeoChange,
} from "@/lib/seo/changeReview"
import ApplyDraftButton from "../../components/ApplyDraftButton"
import RewriteProgress from "../../components/RewriteProgress"

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

  return payload.pidUser
}

async function applyMetadataAction(formData: FormData) {
  "use server"

  await requireSuperAdminPageAccess()
  const pidChange = String(formData.get("pidChange") || "").trim()
  if (!pidChange) return

  let nextUrl = `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?applied=draft`
  try {
    const result = await applySeoMetadataChange(pidChange)
    revalidatePath("/dashboard/marketing/seo")
    revalidatePath(`/dashboard/marketing/seo/changes/${pidChange}`)
    nextUrl = result.status === "awaiting_link_review"
      ? `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?linkReview=1`
      : `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?applied=${result.status}`
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not apply SEO draft."
    nextUrl = `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?error=${encodeURIComponent(message)}`
  }

  redirect(nextUrl)
}

async function generateRewriteAction(formData: FormData) {
  "use server"

  await requireSuperAdminPageAccess()
  const pidChange = String(formData.get("pidChange") || "").trim()
  if (!pidChange) return

  let nextUrl = `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?rewrite=ready`
  try {
    const result = await prepareSeoRewrite(pidChange)
    revalidatePath("/dashboard/marketing/seo")
    revalidatePath(`/dashboard/marketing/seo/changes/${pidChange}`)
    nextUrl = result.status === "awaiting_link_review"
      ? `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?linkReview=1`
      : result.status === "processing"
        ? `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?rewrite=processing`
        : `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?rewrite=ready`
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate the article rewrite."
    nextUrl = `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?error=${encodeURIComponent(message)}`
  }

  redirect(nextUrl)
}

async function approveLinkAction(formData: FormData) {
  "use server"

  const approvedBy = await requireSuperAdminPageAccess()
  const pidChange = String(formData.get("pidChange") || "").trim()
  const url = String(formData.get("url") || "").trim()
  const scope = String(formData.get("scope") || "").trim()
  if (!pidChange || !url || (scope !== "once" && scope !== "global")) return

  let nextUrl = `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?linkReview=1`
  try {
    const result = await approveSeoRewriteLink({ pidChange, url, scope, approvedBy })
    revalidatePath("/dashboard/marketing/seo")
    revalidatePath(`/dashboard/marketing/seo/changes/${pidChange}`)
    nextUrl = result.status === "awaiting_link_review"
      ? `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?linkReview=1`
      : `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?rewrite=ready`
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not approve the link."
    nextUrl = `/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?error=${encodeURIComponent(message)}`
  }

  redirect(nextUrl)
}

async function discardRewriteAction(formData: FormData) {
  "use server"

  await requireSuperAdminPageAccess()
  const pidChange = String(formData.get("pidChange") || "").trim()
  if (!pidChange) return

  await discardSeoRewrite(pidChange)
  revalidatePath("/dashboard/marketing/seo")
  revalidatePath(`/dashboard/marketing/seo/changes/${pidChange}`)
  redirect(`/dashboard/marketing/seo/changes/${encodeURIComponent(pidChange)}?rewriteDiscarded=1`)
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

function previewDocument(content: string | null, emptyMessage: string) {
  const body = String(content || "")
    .replace(/<script\b[^>]*>[^]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/?\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, ' $1="#"')
    .replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .trim() || `<p>${emptyMessage}</p>`
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; padding: 28px; color: #172033; background: #fff; font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; }
      img { max-width: 100%; height: auto; }
      a { color: #0754b8; }
      h1, h2, h3, h4 { line-height: 1.25; margin-top: 1.5em; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #d9dee8; padding: 8px; text-align: left; }
      iframe, video { max-width: 100%; }
    </style>
  </head>
  <body>${body}</body>
</html>`
}

function articleWordCount(content: string | null | undefined) {
  const text = String(content || "")
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/<script\b[^>]*>[^]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[^]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&(?:apos|rsquo|lsquo);|&#(?:39|8216|8217);/gi, "'")
    .replace(/&amp;/gi, " & ")
    .replace(/&#\d+;|&#x[\da-f]+;|&[a-z]+;/gi, " ")

  return text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length || 0
}

export default async function SeoChangeReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ pidChange: string }>
  searchParams?: Promise<{
    applied?: string
    rejected?: string
    error?: string
    linkReview?: string
    rewriteDiscarded?: string
    rewrite?: string
  }>
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
  const originalContent = typeof change.before.blogContent === "string"
    ? change.before.blogContent
    : change.blogContent
  const originalWordCount = articleWordCount(originalContent)
  const proposedWordCount = articleWordCount(change.rewrittenHtml)
  const wordCountDifference = proposedWordCount - originalWordCount
  const wordCountChangePercent = originalWordCount > 0
    ? Math.round((wordCountDifference / originalWordCount) * 100)
    : null
  const needsRewrite =
    !change.rewrittenHtml ||
    !change.rewritePolicyCurrent ||
    change.artifactStatus === "discarded" ||
    change.artifactStatus === "failed"
  const rewriteProcessing =
    change.artifactStatus === "rewriting" && Boolean(change.openAiResponseId)
  const hasReviewableRewrite = Boolean(change.rewrittenHtml) && !needsRewrite
  const canApplyRewrite =
    hasReviewableRewrite &&
    change.pendingLinks.length === 0 &&
    ["ready", "apply_failed"].includes(change.artifactStatus || "")

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
              {change.status !== "applied" && needsRewrite && (
                <form action={generateRewriteAction}>
                  <input type="hidden" name="pidChange" value={change.pidChange} />
                  <ApplyDraftButton
                    label={rewriteProcessing
                      ? "Check Rewrite Status"
                      : change.artifactStatus === "failed"
                        ? "Retry Article Rewrite"
                        : "Generate Article Rewrite"}
                    pendingLabel={rewriteProcessing ? "Checking Status" : "Starting Rewrite"}
                    pendingMessage={rewriteProcessing
                      ? "Checking the saved OpenAI response. This does not start another paid rewrite."
                      : "Starting one background rewrite and saving its response ID. Nothing will be published yet."}
                  />
                </form>
              )}
              {change.status !== "applied" && canApplyRewrite && (
                <form action={applyMetadataAction}>
                  <input type="hidden" name="pidChange" value={change.pidChange} />
                  <ApplyDraftButton label="Apply Approved Rewrite" />
                </form>
              )}
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
      {resolvedSearchParams.linkReview && change.pendingLinks.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-800 dark:text-amber-200">
          The rewrite is saved. Review the new internal link{change.pendingLinks.length === 1 ? "" : "s"} below; approval will make the saved rewrite ready to apply without another AI request.
        </div>
      )}
      {resolvedSearchParams.rewriteDiscarded && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs font-medium text-foreground">
          The saved rewrite was discarded. Generate a new article rewrite when you are ready.
        </div>
      )}
      {resolvedSearchParams.rewrite === "ready" && hasReviewableRewrite && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs font-medium text-blue-700 dark:text-blue-300">
          The article rewrite is saved and ready for review. Compare it with the original below before applying it.
        </div>
      )}
      {rewriteProcessing && (
        <RewriteProgress
          pidChange={change.pidChange}
          startedAt={change.rewriteStartedAt?.toISOString() || null}
          initialStatus={change.openAiResponseStatus}
          model={change.openAiModel}
        />
      )}

      {change.status !== "rejected" && change.artifactStatus === "awaiting_link_review" && change.pendingLinks.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-card p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">New link approval required</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                These links were added by the rewrite and were not in the original article or approved registry.
                Approve a link for this change only, or add it to the approved linkable pages for future drafts.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {change.pendingLinks.map((url) => (
              <div key={url} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 lg:flex-row lg:items-center lg:justify-between">
                <code className="break-all text-xs font-bold text-foreground">{url}</code>
                <div className="flex flex-wrap gap-2">
                  <form action={approveLinkAction}>
                    <input type="hidden" name="pidChange" value={change.pidChange} />
                    <input type="hidden" name="url" value={url} />
                    <input type="hidden" name="scope" value="once" />
                    <button type="submit" className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-800 hover:bg-amber-500/15 dark:text-amber-200">
                      Approve Once
                    </button>
                  </form>
                  <form action={approveLinkAction}>
                    <input type="hidden" name="pidChange" value={change.pidChange} />
                    <input type="hidden" name="url" value={url} />
                    <input type="hidden" name="scope" value="global" />
                    <button type="submit" className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
                      Approve &amp; Add Globally
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>

          <form action={discardRewriteAction} className="mt-4 border-t border-border pt-4">
            <input type="hidden" name="pidChange" value={change.pidChange} />
            <button type="submit" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-700 hover:text-red-800 dark:text-red-300">
              <Trash2 className="h-3.5 w-3.5" />
              Discard Rewrite
            </button>
          </form>
        </section>
      )}

      {(change.artifactStatus === "failed" || change.artifactStatus === "apply_failed") && change.artifactErrorMessage && (
        <section className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-700 dark:text-red-300">
          <p className="font-bold">
            {change.artifactStatus === "apply_failed"
              ? "The saved rewrite could not be applied."
              : `Rewrite attempt ${change.rewriteAttemptCount || 1} failed and was saved.`}
          </p>
          <p className="mt-1">{change.artifactErrorMessage}</p>
          <p className="mt-2">
            {change.artifactStatus === "apply_failed"
              ? "Apply again to retry the database update using the saved rewrite; the AI will not run again."
              : "Generate the article rewrite again to retry this stage; the SEO proposal will not be regenerated."}
          </p>
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">1. SEO proposal</p>
          <p className="mt-2 text-xs leading-relaxed text-foreground">Saved. Review the metadata, FAQ, links and content brief on this page.</p>
        </div>
        <div className={`rounded-xl border p-4 ${hasReviewableRewrite ? "border-emerald-500/20 bg-emerald-500/10" : "border-blue-500/20 bg-blue-500/10"}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${hasReviewableRewrite ? "text-emerald-700 dark:text-emerald-300" : "text-blue-700 dark:text-blue-300"}`}>2. Article rewrite</p>
          <p className="mt-2 text-xs leading-relaxed text-foreground">
            {hasReviewableRewrite ? "Saved. Compare the original and proposed article below." : "Generate a current-policy rewrite with researched sources and preserved external links. This does not publish it."}
          </p>
        </div>
        <div className={`rounded-xl border p-4 ${change.status === "applied" ? "border-emerald-500/20 bg-emerald-500/10" : "border-border bg-card"}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${change.status === "applied" ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}>3. Approve and apply</p>
          <p className="mt-2 text-xs leading-relaxed text-foreground">
            {change.status === "applied" ? "Applied to the blog." : "Resolve any new links, finish your review, then explicitly apply the rewrite."}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Article Content Review</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Compare the current article with the saved proposal. Previewing does not modify the live blog.
            </p>
          </div>
          {change.rewriteGeneratedAt && (
            <span className="font-mono text-[10px] text-muted-foreground">
              Rewrite saved {formatDate(change.rewriteGeneratedAt)}
            </span>
          )}
        </div>

        {hasReviewableRewrite ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Existing article</p>
                <p className="mt-1 text-xl font-bold text-foreground">{originalWordCount.toLocaleString()} words</p>
              </div>
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">To be published</p>
                <p className="mt-1 text-xl font-bold text-foreground">{proposedWordCount.toLocaleString()} words</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Word count change</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {wordCountDifference > 0 ? "+" : ""}{wordCountDifference.toLocaleString()} words
                </p>
                {wordCountChangePercent !== null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {wordCountChangePercent > 0 ? "+" : ""}{wordCountChangePercent}% from the existing article
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <span>Original article</span>
                  <span className="whitespace-nowrap normal-case tracking-normal">{originalWordCount.toLocaleString()} words</span>
                </div>
                <iframe
                  title="Original article preview"
                  sandbox="allow-scripts allow-presentation"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  srcDoc={previewDocument(originalContent, "The original article is empty.")}
                  className="h-[42rem] w-full bg-white"
                />
              </div>
              <div className="overflow-hidden rounded-xl border border-blue-500/30 bg-background">
                <div className="flex items-center justify-between gap-3 border-b border-blue-500/20 bg-blue-500/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                  <span>Proposed rewrite</span>
                  <span className="whitespace-nowrap normal-case tracking-normal">{proposedWordCount.toLocaleString()} words</span>
                </div>
                <iframe
                  title="Proposed article rewrite preview"
                  sandbox="allow-scripts allow-presentation"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  srcDoc={previewDocument(change.rewrittenHtml, "No proposed rewrite was saved.")}
                  className="h-[42rem] w-full bg-white"
                />
              </div>
            </div>
            {change.appliedChanges.length > 0 && (
              <div className="mt-5 rounded-lg border border-border bg-background p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI change summary</p>
                <div className="mt-3">
                  <JsonList items={change.appliedChanges} />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mt-5 flex flex-col items-start gap-4 rounded-xl border border-dashed border-border bg-background p-6">
            <div>
              <p className="text-sm font-bold text-foreground">No article rewrite has been generated.</p>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                {rewriteProcessing
                  ? "The rewrite is processing in the background. Check its saved response later; this will not start another paid generation."
                  : "The SEO proposal below is saved. Generate the article rewrite to create a reviewable preview; this will not publish anything."}
              </p>
            </div>
            {change.status !== "rejected" && change.status !== "applied" && (
              <form action={generateRewriteAction}>
                <input type="hidden" name="pidChange" value={change.pidChange} />
                <ApplyDraftButton
                  label={rewriteProcessing ? "Check Rewrite Status" : "Generate Article Rewrite"}
                  pendingLabel={rewriteProcessing ? "Checking Status" : "Starting Rewrite"}
                  pendingMessage={rewriteProcessing
                    ? "Checking the saved OpenAI response. This does not start another paid rewrite."
                    : "Starting one background rewrite and saving its response ID. Nothing will be published yet."}
                />
              </form>
            )}
          </div>
        )}
      </section>

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
