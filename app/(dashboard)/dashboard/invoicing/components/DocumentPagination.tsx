'use client';

export type Pagination = { page: number; limit: number; totalCount: number; totalPages: number };
export const initialPagination: Pagination = { page: 1, limit: 20, totalCount: 0, totalPages: 0 };

export default function DocumentPagination({ pagination: p, busy, onPage }: { pagination: Pagination; busy: boolean; onPage: (page: number) => void }) {
  const pages = Math.max(1, p.totalPages);
  const button = 'rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40';
  return <nav aria-label="Document pagination" className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-4">
    <p aria-live="polite" className="text-sm text-muted-foreground">{p.totalCount ? `${(p.page - 1) * p.limit + 1}–${Math.min(p.page * p.limit, p.totalCount)} of ${p.totalCount.toLocaleString()} results` : '0 results'}</p>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={button} disabled={busy || p.page <= 1} onClick={() => onPage(1)}>First</button>
      <button type="button" className={button} disabled={busy || p.page <= 1} onClick={() => onPage(p.page - 1)}>Previous</button>
      <span className="px-2 text-sm text-muted-foreground">Page {p.page} of {pages}</span>
      <button type="button" className={button} disabled={busy || p.page >= pages} onClick={() => onPage(p.page + 1)}>Next</button>
      <button type="button" className={button} disabled={busy || p.page >= pages} onClick={() => onPage(pages)}>Last</button>
    </div>
  </nav>;
}
