"use client";

import { Search, X } from "lucide-react";

export default function ServiceOrderSearch({
  value,
  onChange,
  resultCount,
  totalCount,
  placeholder = "Search orders by ID, customer, phone or details…",
}: {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount?: number;
  placeholder?: string;
}) {
  const hasQuery = value.trim().length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search orders in this stage</span>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="min-h-11 w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-11 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {hasQuery ? (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Clear order search"
              className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
        <p
          className="shrink-0 px-1 text-xs font-semibold text-muted-foreground sm:min-w-28 sm:text-right"
          aria-live="polite"
        >
          {hasQuery
            ? totalCount == null
              ? `${resultCount} found`
              : `${resultCount} of ${totalCount} found`
            : `${totalCount ?? resultCount} ${(totalCount ?? resultCount) === 1 ? "order" : "orders"}`}
        </p>
      </div>
    </div>
  );
}
