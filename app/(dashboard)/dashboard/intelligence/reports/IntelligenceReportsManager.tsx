"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  FilePenLine,
  FilePlus2,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
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
  automationStatus?: string | null;
  automationError?: string | null;
  versions: Version[];
};
type PendingDeletion =
  | { kind: "report"; report: Report }
  | { kind: "version"; report: Report; version: Version };
type PendingPublication = { report: Report; version: Version };

type AutomationStepId =
  | "draft"
  | "suppliers"
  | "seo"
  | "cover"
  | "pdf"
  | "upload"
  | "quality"
  | "approval";
type AutomationStepStatus = "pending" | "active" | "completed" | "failed";
type AutomationStepState = {
  id: AutomationStepId;
  label: string;
  status: AutomationStepStatus;
  detail: string;
};

const automationStepDefinitions: Array<
  Pick<AutomationStepState, "id" | "label">
> = [
  { id: "draft", label: "Prepare report" },
  { id: "suppliers", label: "Validate manufacturers" },
  { id: "seo", label: "Research and write product page" },
  { id: "cover", label: "Create and review cover" },
  { id: "pdf", label: "Render PDF" },
  { id: "upload", label: "Store finished document" },
  { id: "quality", label: "Run final quality gate" },
  { id: "approval", label: "Ready for your approval" },
];

function freshAutomationProgress(): AutomationStepState[] {
  return automationStepDefinitions.map((step) => ({
    ...step,
    status: "pending",
    detail: "Waiting",
  }));
}

const inputClass =
  "mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

export default function IntelligenceReportsManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [categoryId, setCategoryId] = useState("");
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
  const [pendingPublication, setPendingPublication] =
    useState<PendingPublication | null>(null);
  const [automationProgress, setAutomationProgress] = useState<
    AutomationStepState[]
  >([]);
  const [automationElapsed, setAutomationElapsed] = useState(0);
  const [awaitingApproval, setAwaitingApproval] = useState(false);

  const automationBusy =
    busy === "create" || busy.startsWith("automate:");

  useEffect(() => {
    if (!automationBusy) return;
    const timer = window.setInterval(
      () => setAutomationElapsed((elapsed) => elapsed + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [automationBusy]);

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
          category.suppliers.length >= 10 &&
          !reports.some((report) => report.nicheId === category.pidNiche),
      ),
    [categories, reports],
  );
  const selectedCategory = categories.find(
    (category) => category.pidNiche === categoryId,
  );

  async function automateReport(input: {
    nicheId: string;
    categoryName: string;
    editionLabel: string;
    busyKey: string;
  }) {
    setBusy(input.busyKey);
    setError("");
    setMessage("");
    setAutomationProgress(freshAutomationProgress());
    setAutomationElapsed(0);
    setAwaitingApproval(false);
    try {
      const response = await fetch("/api/intelligence/reports/automate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nicheId: input.nicheId,
          categoryName: input.categoryName,
          editionLabel: input.editionLabel,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to prepare the report.");
      }
      if (!response.body) {
        throw new Error("The report progress stream could not be opened.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completedSupplierCount = 0;
      let streamError = "";

      const handleEvent = (event: any) => {
        if (event?.type === "progress") {
          setAutomationProgress((current) =>
            current.map((step) =>
              step.id === event.step
                ? {
                    ...step,
                    status: event.status,
                    detail: String(event.detail || step.detail),
                  }
                : step,
            ),
          );
        } else if (event?.type === "complete") {
          completedSupplierCount = Number(event.supplierCount || 0);
          setAwaitingApproval(Boolean(event.awaitingApproval));
        } else if (event?.type === "heartbeat") {
          setAutomationElapsed((elapsed) =>
            Math.max(elapsed, Number(event.elapsedSeconds || 0)),
          );
        } else if (event?.type === "error") {
          streamError = String(
            event.error || "Unable to prepare the report.",
          );
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = done ? "" : lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) handleEvent(JSON.parse(line));
        }
        if (done) {
          if (buffer.trim()) handleEvent(JSON.parse(buffer));
          break;
        }
      }
      if (streamError) throw new Error(streamError);
      if (!completedSupplierCount) {
        throw new Error("The report process ended without a completion result.");
      }
      setMessage(
        `${input.categoryName} was generated with ${completedSupplierCount} verified manufacturers and passed every quality check. Preview the PDF, then approve it before publishing.`,
      );
      setCategoryId("");
      await load();
    } catch (caught) {
      setAutomationProgress((current) =>
        current.map((step) =>
          step.status === "active" ? { ...step, status: "failed" } : step,
        ),
      );
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to prepare the report.",
      );
    } finally {
      setBusy("");
    }
  }

  async function createReport(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedCategory) return;
    await automateReport({
      nicheId: selectedCategory.pidNiche,
      categoryName: selectedCategory.name,
      editionLabel,
      busyKey: "create",
    });
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
      setPendingPublication(null);
      setAwaitingApproval(false);
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
        caught instanceof Error
          ? caught.message
          : "Unable to delete this edition.",
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
              Create a report for review
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Eligible categories have at least 10 approved manufacturers. One
              action creates the product page, generates its category cover and
              PDF, and applies every quality gate. Nothing is published until
              you preview and explicitly approve the finished edition.
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
                <Sparkles className="h-4 w-4" />
              )}
              Create report for review
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Works from this deployed dashboard and from localhost. Cover and SEO
          generation can take several minutes; live progress appears below.
        </p>
      </section>

      {automationProgress.length ? (
        <section
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Report production
              </p>
              <h2 className="mt-1 font-semibold text-card-foreground">
                {automationBusy
                  ? "Creating your report"
                  : awaitingApproval
                    ? "Ready for your approval"
                    : automationProgress.every(
                        (step) => step.status === "completed",
                      )
                    ? "Report completed"
                    : "Report production stopped"}
              </h2>
            </div>
            <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
              {Math.floor(automationElapsed / 60)}:
              {String(automationElapsed % 60).padStart(2, "0")} elapsed
            </span>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {automationProgress.map((step) => (
              <div
                key={step.id}
                className={`flex gap-3 rounded-lg border px-3 py-3 transition-colors ${
                  step.status === "active"
                    ? "border-primary/35 bg-primary/5"
                    : step.status === "completed"
                      ? "border-emerald-200 bg-emerald-50/60"
                      : step.status === "failed"
                        ? "border-destructive/25 bg-destructive/5"
                        : "border-border bg-muted/20"
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {step.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : step.status === "active" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : step.status === "failed" ? (
                    <TriangleAlert className="h-4 w-4 text-destructive" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Price: ₦{editing.priceNaira.toLocaleString()} · $
              {(editing.priceUsdCents / 100).toFixed(2)}. Update this centrally
              from Supplier Intelligence Settings.
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
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${report.status === "published" ? "bg-emerald-100 text-emerald-800" : report.automationStatus === "awaiting_approval" ? "bg-amber-100 text-amber-900" : "bg-muted text-muted-foreground"}`}
                >
                  {report.status === "published"
                    ? "published"
                    : report.automationStatus === "awaiting_approval"
                      ? "awaiting approval"
                      : report.status}
                </span>
              </div>
              {report.automationStatus === "failed" &&
              report.automationError ? (
                <div className="mt-4 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  Automation stopped safely: {report.automationError}
                  <span className="mt-1 block font-medium">
                    Resume to reuse completed work and continue with this
                    feedback.
                  </span>
                </div>
              ) : null}
              {report.status === "draft" &&
              report.automationStatus === "awaiting_approval" &&
              latest?.pdfUrl ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  This report passed the automated quality gate and is waiting
                  for your review. It is not visible to customers.
                </div>
              ) : null}
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
                {report.status === "draft" &&
                !(
                  report.automationStatus === "awaiting_approval" &&
                  latest?.pdfUrl
                ) ? (
                  <button
                    onClick={() => {
                      const category = categories.find(
                        (item) => item.pidNiche === report.nicheId,
                      );
                      if (!category) {
                        setError("The report category could not be resolved.");
                        return;
                      }
                      void automateReport({
                        nicheId: report.nicheId,
                        categoryName: category.name,
                        editionLabel: report.editionLabel,
                        busyKey: `automate:${report.pidReport}`,
                      });
                    }}
                    disabled={Boolean(busy)}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {busy === `automate:${report.pidReport}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {report.automationStatus === "failed"
                      ? "Resume from failed step"
                      : "Complete report for review"}
                  </button>
                ) : null}
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
                    onClick={() =>
                      setPendingPublication({ report, version: latest })
                    }
                    disabled={Boolean(busy)}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    Review and publish
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

      {pendingPublication ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-publish-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <p className="text-center text-xs font-bold uppercase tracking-widest text-primary">
                Final confirmation
              </p>
              <h3
                id="report-publish-title"
                className="mt-2 text-center text-xl font-bold tracking-tight text-foreground"
              >
                Approve and publish this report?
              </h3>
              <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
                “{pendingPublication.report.title}” Version {" "}
                {pendingPublication.version.versionNumber} contains {" "}
                {pendingPublication.version.supplierCount} manufacturers. Once
                approved, its product page and PDF will become available to
                customers.
              </p>
              <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">
                  Before you publish
                </p>
                <ul className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    Preview the complete PDF, including its cover and supplier
                    pages.
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    Confirm the category, edition, manufacturer count and
                    presentation are correct.
                  </li>
                </ul>
              </div>
              <a
                href={`/api/intelligence/reports/${pendingPublication.report.pidReport}/preview?versionId=${encodeURIComponent(pendingPublication.version.pidVersion)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" />
                Preview PDF in a new tab
              </a>
              {error ? (
                <p className="mt-4 text-center text-xs text-destructive">
                  {error}
                </p>
              ) : null}
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPendingPublication(null);
                    setError("");
                  }}
                  disabled={Boolean(busy)}
                  className="flex-1 rounded-md border border-border bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  Not yet
                </button>
                <button
                  type="button"
                  onClick={() =>
                    publish(
                      pendingPublication.report,
                      pendingPublication.version.pidVersion,
                    )
                  }
                  disabled={Boolean(busy)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ===
                  `publish:${pendingPublication.report.pidReport}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {busy === `publish:${pendingPublication.report.pidReport}`
                    ? "Publishing..."
                    : "Approve and publish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
