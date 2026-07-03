'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers3,
  Loader2,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';

type Supplier = {
  pidSupplier: string;
  supplierName: string | null;
  productFit: string | null;
  productsMade: string[];
  officialWebsite: string | null;
  whatsapp: string | null;
  whatsappUrl?: string | null;
  countryRegion: string | null;
  linkSource: string | null;
};

type Category = {
  pidNiche: string;
  name: string;
  slug: string;
  summary: string | null;
  suppliers: Supplier[];
};

export default function SupplierCategoriesClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapping, setMapping] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const supplierCount = useMemo(() => {
    const seen = new Set<string>();
    categories.forEach((category) => {
      category.suppliers.forEach((supplier) => seen.add(supplier.pidSupplier));
    });
    return seen.size;
  }, [categories]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/intelligence/categories', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load categories.');
      }
      setCategories(data.data || []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const autoMap = async () => {
    setMapping(true);
    const toastId = toast.loading('Auto-linking suppliers to related categories...');
    try {
      const response = await fetch('/api/intelligence/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_map' }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Auto-link failed.');
      }
      toast.success(data.message || 'Auto-link completed.', { id: toastId });
      await loadCategories();
    } catch (error: any) {
      toast.error(error?.message || 'Auto-link failed.', { id: toastId });
    } finally {
      setMapping(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Categories" value={categories.length} />
          <Metric label="Unique suppliers" value={supplierCount} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadCategories}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={autoMap}
            disabled={mapping}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {mapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Auto-link suppliers
          </button>
        </div>
      </section>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading supplier categories...
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No published supplier categories yet.
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.pidNiche}
              category={category}
              expanded={Boolean(expandedCategories[category.pidNiche])}
              onToggle={() =>
                setExpandedCategories((current) => ({
                  ...current,
                  [category.pidNiche]: !current[category.pidNiche],
                }))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getWhatsAppHref(value?: string | null) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

function whatsappHref(value?: string | null, url?: string | null) {
  if (url?.startsWith('https://wa.me/') || url?.startsWith('https://api.whatsapp.com/')) {
    return url;
  }
  return getWhatsAppHref(value);
}

function CategoryCard({
  category,
  expanded,
  onToggle,
}: {
  category: Category;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
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
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              <Layers3 className="h-3.5 w-3.5" />
              {category.suppliers.length} suppliers
            </div>
            <h2 className="mt-3 truncate text-lg font-bold text-foreground">
              {category.name}
            </h2>
            {category.summary ? (
              <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {category.summary}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 lg:flex-col lg:items-end">
          <span className="font-mono text-[10px] font-bold text-muted-foreground">
            {category.slug}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {expanded ? 'Close' : 'Open'}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-border p-5">
          <div className="grid gap-3">
            {category.suppliers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No suppliers linked to this category yet.
              </p>
            ) : (
              category.suppliers.map((supplier) => (
                <div
                  key={`${category.pidNiche}-${supplier.pidSupplier}`}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-bold text-foreground">
                        {supplier.supplierName || 'Unnamed supplier'}
                      </h3>
                      {supplier.productFit ? (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {supplier.productFit}
                        </p>
                      ) : null}
                      {supplier.productsMade.length > 0 ? (
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
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                      {supplier.linkSource ? (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                          {supplier.linkSource.replace(/_/g, ' ')}
                        </span>
                      ) : null}
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
                      {supplier.whatsapp ? (
                        <a
                          href={whatsappHref(supplier.whatsapp, supplier.whatsappUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                        >
                          WhatsApp
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
