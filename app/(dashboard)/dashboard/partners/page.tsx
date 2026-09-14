import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePartnerReviewer, reviewQueue } from "@/lib/partners/review";
import ReviewWorkspace from "./ReviewWorkspace";
export const dynamic = "force-dynamic";
export default async function PartnerReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  if (!(await requirePartnerReviewer())) redirect("/dashboard");
  const query = await searchParams;
  const page = Math.max(
    1,
    Math.min(100000, Number.parseInt(query.page || "1", 10) || 1),
  );
  const rows = await reviewQueue(page);
  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Partner Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage business-fit reviews, verification and final partner approval.</p>
        </div>
        <div className="flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted" href="/dashboard/partners/countries">Country settings</Link><Link className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted" href="/dashboard/partners/domains">Partner domains</Link></div>
      </div>
      <ReviewWorkspace
        rows={rows.map((row) => ({
          ...row,
          submittedAt: row.submittedAt?.toISOString() || null,
        }))}
      />
      {(page > 1 || rows.length > 0) && (
        <nav
          aria-label="Review queue pages"
          className="flex flex-wrap items-center justify-end gap-4 border-t border-border pt-5 text-sm"
        >
          {page > 1 && (
            <Link
              className="rounded-lg border border-border bg-card px-4 py-2.5 font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`?page=${page - 1}`}
            >
              Previous
            </Link>
          )}
          <span>Page {page}</span>
          {rows.length === 25 && (
            <Link
              className="rounded-lg border border-border bg-card px-4 py-2.5 font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`?page=${page + 1}`}
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
