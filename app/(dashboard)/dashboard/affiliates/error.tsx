'use client';
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return <section role="alert" className="rounded-xl border border-border bg-card p-8 text-center"><h2 className="text-lg font-semibold text-foreground">Affiliate records could not be loaded</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Please try again. No account, payment or commission records have been changed.</p><button type="button" onClick={reset} className="mt-6 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring">Try again</button></section>;
}
