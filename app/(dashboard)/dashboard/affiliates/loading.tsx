export default function Loading() {
  return <div role="status" aria-label="Loading affiliate workspace" className="space-y-6 p-1"><p className="text-sm text-muted-foreground">Loading affiliate workspace…</p><div className="h-12 max-w-md animate-pulse rounded-lg bg-muted" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map(key => <div key={key} className="h-32 animate-pulse rounded-xl border border-border bg-card" />)}</div><div className="h-80 animate-pulse rounded-xl border border-border bg-card" /></div>;
}
