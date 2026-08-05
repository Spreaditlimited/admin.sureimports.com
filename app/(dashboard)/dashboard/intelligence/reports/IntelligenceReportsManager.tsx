"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FilePenLine,
  FilePlus2,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  TriangleAlert,
} from "lucide-react";

type Category = {
  pidNiche: string;
  name: string;
  slug: string;
  suppliers: unknown[];
};
type Version = {
  pidVersion: string;
  versionNumber: number;
  supplierCount: number;
  status: string;
  pdfUrl?: string | null;
  generatedAt: string;
};
type Report = {
  pidReport: string;
  nicheId: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  editionLabel: string;
  priceNaira: number;
  priceUsdCents: number;
  supplierCount: number;
  status: string;
  currentVersionId?: string | null;
  versions: Version[];
};
type PendingDeletion =
  | { kind: "report"; report: Report }
  | { kind: "version"; report: Report; version: Version };

const inputClass =
  "mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

export default function IntelligenceReportsManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [priceNaira, setPriceNaira] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [editionLabel, setEditionLabel] = useState(
    new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
      new Date(),
    ),
  );
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Report | null>(null);
  const [pendingDeletion, setPendingDeletion] =
    useState<PendingDeletion | null>(null);

  const load = useCallback(async () => {
    const [categoryResponse, reportResponse] = await Promise.all([
      fetch("/api/intelligence/categories", { cache: "no-store" }),
      fetch("/api/intelligence/reports", { cache: "no-store" }),
    ]);
    const [categoryData, reportData] = await Promise.all([
      categoryResponse.json(),
      reportResponse.json(),
    ]);
    if (categoryResponse.ok) setCategories(categoryData.data || []);
    if (reportResponse.ok) setReports(reportData.data || []);
  }, []);

  useEffect(() => {
    load().catch(() =>
      setError("Unable to load Supplier Intelligence reports."),
    );
  }, [load]);

  const availableCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          !reports.some((report) => report.nicheId === category.pidNiche),
      ),
    [categories, reports],
  );
  const selectedCategory = categories.find(
    (category) => category.pidNiche === categoryId,
  );

  async function createReport(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedCategory) return;
    setBusy("create");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/intelligence/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nicheId: selectedCategory.pidNiche,
          categoryName: selectedCategory.name,
          editionLabel,
          priceNaira: Number(priceNaira),
          priceUsdCents: Math.round(Number(priceUsd) * 100),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to create report.");
      setMessage(
        `Draft created with ${data.data.supplierCount} ${data.data.supplierCount === 1 ? "approved supplier" : "approved suppliers"}. Generate its first PDF edition when ready.`,
      );
      setCategoryId("");
      setPriceNaira("");
      setPriceUsd("");
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create report.",
      );
    } finally {
      setBusy("");
    }
  }

  async function generate(pidReport: string) {
    setBusy(`generate:${pidReport}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/intelligence/reports/${pidReport}/generate`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to generate PDF.");
      setMessage(
        `Edition ${data.data.versionNumber} generated with ${data.data.supplierCount} suppliers.`,
      );
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to generate PDF.",
      );
    } finally {
      setBusy("");
    }
  }

  async function saveReport(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(`edit:${editing.pidReport}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/intelligence/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to update report.");
      setMessage(
        "Report details updated. Generate a new edition to apply content changes to the PDF.",
      );
      setEditing(null);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update report.",
      );
    } finally {
      setBusy("");
    }
  }

  async function publish(report: Report, versionId: string) {
    setBusy(`publish:${report.pidReport}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/intelligence/reports/${report.pidReport}/publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to publish report.");
      setMessage(`${report.title} is now published.`);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to publish report.",
      );
    } finally {
      setBusy("");
    }
  }

  async function deleteEdition(report: Report, version: Version) {
    setBusy(`delete-version:${version.pidVersion}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/intelligence/reports/${report.pidReport}/versions/${version.pidVersion}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to delete this edition.");
      setMessage(`Version ${version.versionNumber} was permanently deleted.`);
      setPendingDeletion(null);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete this edition.",
      );
    } finally {
      setBusy("");
    }
  }

  async function deleteDraft(report: Report) {
    setBusy(`delete-report:${report.pidReport}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/intelligence/reports/${report.pidReport}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to delete this draft report.");
      if (editing?.pidReport === report.pidReport) setEditing(null);
      setMessage(`${report.title} was permanently deleted.`);
      setPendingDeletion(null);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to delete this draft report.",
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary">
            <FilePlus2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-card-foreground">
              Create a report product
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pricing is stored per product. Customers in Nigeria see NGN;
              international customers see USD.
            </p>
          </div>
        </div>
        <form
          onSubmit={createReport}
          className="mt-5 grid gap-4 md:grid-cols-4"
        >
          <label className="text-sm font-medium text-foreground md:col-span-2">
            Supplier category
            <select
              className={inputClass}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              <option value="">Select a category</option>
              {availableCategories.map((category) => (
                <option key={category.pidNiche} value={category.pidNiche}>
                  {category.name} ({category.suppliers.length} suppliers)
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-foreground">
            Price in NGN
            <input
              className={inputClass}
              inputMode="numeric"
              value={priceNaira}
              onChange={(event) => setPriceNaira(event.target.value)}
              placeholder="15000"
              required
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            Price in USD
            <input
              className={inputClass}
              inputMode="decimal"
              value={priceUsd}
              onChange={(event) => setPriceUsd(event.target.value)}
              placeholder="19.00"
              required
            />
          </label>
          <label className="text-sm font-medium text-foreground md:col-span-2">
            Edition label
            <input
              className={inputClass}
              value={editionLabel}
              onChange={(event) => setEditionLabel(event.target.value)}
              required
            />
          </label>
          <div className="flex items-end md:col-span-2">
            <button
              disabled={busy === "create"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy === "create" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FilePlus2 className="h-4 w-4" />
              )}
              Create report
            </button>
          </div>
        </form>
      </section>

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {editing ? (
        <section className="rounded-xl border border-primary/30 bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Report editor
              </p>
              <h2 className="mt-2 font-semibold text-card-foreground">
                {editing.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <form
            onSubmit={saveReport}
            className="mt-5 grid gap-4 md:grid-cols-2"
          >
            <label className="text-sm font-medium text-foreground md:col-span-2">
              Title
              <input
                className={inputClass}
                value={editing.title}
                onChange={(event) =>
                  setEditing({ ...editing, title: event.target.value })
                }
                required
              />
            </label>
            <label className="text-sm font-medium text-foreground md:col-span-2">
              Subtitle
              <textarea
                className={inputClass}
                rows={2}
                value={editing.subtitle || ""}
                onChange={(event) =>
                  setEditing({ ...editing, subtitle: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium text-foreground md:col-span-2">
              Sales description
              <textarea
                className={inputClass}
                rows={3}
                value={editing.description || ""}
                onChange={(event) =>
                  setEditing({ ...editing, description: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              Edition label
              <input
                className={inputClass}
                value={editing.editionLabel}
                onChange={(event) =>
                  setEditing({ ...editing, editionLabel: event.target.value })
                }
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-foreground">
                Price NGN
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={editing.priceNaira}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      priceNaira: Number(event.target.value),
                    })
                  }
                  required
                />
              </label>
              <label className="text-sm font-medium text-foreground">
                Price USD
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={(editing.priceUsdCents / 100).toFixed(2)}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      priceUsdCents: Math.round(
                        Number(event.target.value) * 100,
                      ),
                    })
                  }
                  required
                />
              </label>
            </div>
            <div className="md:col-span-2">
              <button
                disabled={Boolean(busy)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy === `edit:${editing.pidReport}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FilePenLine className="h-4 w-4" />
                )}
                Save report
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        {reports.map((report) => {
          const latest = report.versions[0];
          return (
            <article
              key={report.pidReport}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">
                    {report.editionLabel}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-card-foreground">
                    {report.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {report.supplierCount || latest?.supplierCount || 0}{" "}
                    suppliers · ₦{report.priceNaira.toLocaleString()} · $
                    {(report.priceUsdCents / 100).toFixed(2)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${report.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}
                >
                  {report.status}
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => setEditing(report)}
                  disabled={Boolean(busy)}
                  className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
                >
                  <FilePenLine className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => generate(report.pidReport)}
                  disabled={Boolean(busy)}
                  className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
                >
                  {busy === `generate:${report.pidReport}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Generate new edition
                </button>
                {latest?.pdfUrl ? (
                  <a
                    href={`/api/intelligence/reports/${report.pidReport}/preview?versionId=${encodeURIComponent(latest.pidVersion)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Preview PDF
                  </a>
                ) : null}
                {latest?.pdfUrl && latest.status !== "published" ? (
                  <button
                    onClick={() => publish(report, latest.pidVersion)}
                    disabled={Boolean(busy)}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {busy === `publish:${report.pidReport}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Publish edition
                  </button>
                ) : null}
                {report.status === "draft" ? (
                  <button
                    onClick={() =>
                      setPendingDeletion({ kind: "report", report })
                    }
                    disabled={Boolean(busy)}
                    className="inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
                  >
                    {busy === `delete-report:${report.pidReport}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete draft
                  </button>
                ) : null}
              </div>
              {report.versions.length ? (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Edition history
                  </p>
                  {report.versions.map((version) => (
                    <div
                      key={version.pidVersion}
                      className="flex items-center justify-between py-1.5 text-sm"
                    >
                      <span className="inline-flex items-center gap-2 text-foreground">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Version {version.versionNumber} ·{" "}
                        {version.supplierCount} suppliers
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {version.status}
                        </span>
                        {version.status !== "published" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDeletion({
                                kind: "version",
                                report,
                                version,
                              })
                            }
                            disabled={Boolean(busy)}
                            title={`Delete Version ${version.versionNumber}`}
                            aria-label={`Delete Version ${version.versionNumber}`}
                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-60"
                          >
                            {busy === `delete-version:${version.pidVersion}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      {pendingDeletion ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-delete-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10">
                <TriangleAlert className="h-6 w-6 text-destructive" />
              </div>
              <h3
                id="report-delete-title"
                className="text-center text-xl font-bold tracking-tight text-foreground"
              >
                {pendingDeletion.kind === "report"
                  ? "Delete draft report?"
                  : "Delete generated edition?"}
              </h3>
              <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
                {pendingDeletion.kind === "report"
                  ? `“${pendingDeletion.report.title}” and every generated PDF edition attached to it will be removed permanently.`
                  : `Version ${pendingDeletion.version.versionNumber} of “${pendingDeletion.report.title}” and its stored PDF will be removed permanently.`}
              </p>
              <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-center text-xs font-medium text-destructive">
                This action cannot be undone.
              </div>
              {error ? (
                <p className="mt-4 text-center text-xs text-destructive">
                  {error}
                </p>
              ) : null}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPendingDeletion(null);
                    setError("");
                  }}
                  disabled={Boolean(busy)}
                  className="flex-1 rounded-md border border-border bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    pendingDeletion.kind === "report"
                      ? deleteDraft(pendingDeletion.report)
                      : deleteEdition(
                          pendingDeletion.report,
                          pendingDeletion.version,
                        )
                  }
                  disabled={Boolean(busy)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy.startsWith("delete-") ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {busy.startsWith("delete-")
                    ? "Deleting..."
                    : pendingDeletion.kind === "report"
                      ? "Delete draft"
                      : "Delete edition"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
