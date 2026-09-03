"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  BedDouble,
  Car,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  Loader2,
  MapPin,
  Plane,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  TrainFront,
} from "lucide-react";
import { toast } from "sonner";
import { matchesServiceOrderSearch } from "@/lib/serviceOrderSearch";
import {
  publishSupplierVerificationReport,
  quoteSupplierTransport,
  researchSupplierTravel,
  saveSupplierVerificationSettings,
  updateSupplierVerification,
} from "../actions";

type Settings = {
  feeNaira: number;
  feeUsd: number;
  officeAddressChinese: string;
  officeLatitude: string;
  officeLongitude: string;
  onlineEnabled: boolean;
  physicalEnabled: boolean;
  quoteValidityDays: number;
  onlineTurnaroundDays: number;
  physicalTurnaroundDays: number;
  defaultLodgingCny: number;
  travelContingencyPercent: number;
};
type ExchangeRates = { ngnPerCny: number; cnyPerUsd: number };
type RequestItem = Record<string, any> & {
  pidVerifySupplier: string;
  supplierName: string | null;
  supplierNameChinese: string | null;
  status: string | null;
  verificationType: string;
  payments: Array<Record<string, any>>;
  events: Array<Record<string, any>>;
};

const nextStatuses: Record<string, string[]> = {
  PAID: ["IN_REVIEW", "CANCELLED"],
  IN_REVIEW: ["VISIT_SCHEDULED", "REPORT_READY", "CANCELLED"],
  VISIT_SCHEDULED: ["IN_REVIEW", "REPORT_READY", "CANCELLED"],
  REPORT_READY: ["COMPLETED"],
};
const labels: Record<string, string> = {
  AWAITING_TRAVEL_QUOTE: "Travel quote needed",
  QUOTE_READY: "Quote ready",
  AWAITING_PAYMENT: "Awaiting payment",
  PAYMENT_PENDING: "Payment pending",
  PAID: "Paid",
  IN_REVIEW: "In review",
  VISIT_SCHEDULED: "Visit scheduled",
  REPORT_READY: "Report ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  DISPUTED: "Disputed",
};

function verificationPaymentPaid(item: RequestItem) {
  return item.payments.some(
    (payment) =>
      payment.status === "paid" &&
      ["VERIFICATION", "LEGACY_COMBINED"].includes(
        payment.paymentPurpose || "VERIFICATION",
      ),
  );
}

export default function SupplierVerificationAdmin({
  initialSettings,
  initialRequests,
  exchangeRates,
}: {
  initialSettings: Settings;
  initialRequests: RequestItem[];
  exchangeRates: ExchangeRates;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(
    () =>
      initialRequests.filter((item) => {
        const matchesStatus = status === "ALL" || item.status === status;
        return (
          matchesStatus &&
          matchesServiceOrderSearch(query, [
            item.pidVerifySupplier,
            item.pidUser,
            item.userEmail,
            item.customerName,
            item.supplierName,
            item.supplierNameChinese,
            item.registrationNumber,
            item.supplierPhone,
            item.supplierEmail,
            item.supplierWechat,
            item.supplierAddress,
            item.supplierAddressChinese,
            item.supplierProduct,
            item.supplierWebsite,
            item.billingCountry,
            item.verificationType,
            item.status,
            item.transportQuoteStatus,
          ])
        );
      }),
    [initialRequests, query, status],
  );

  const run = (work: () => Promise<unknown>, success: string) =>
    startTransition(async () => {
      try {
        await work();
        toast.success(success);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed.");
      }
    });

  const saveSettings = () =>
    run(
      () => saveSupplierVerificationSettings(settings),
      "Supplier Verification settings saved.",
    );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 px-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
          <ShieldCheck className="h-4 w-4" /> China operations
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Supplier Verification
        </h1>
        <p className="text-sm text-muted-foreground">
          Price the service, confirm travel, manage due diligence and publish
          customer reports.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50">
            <Settings2 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-bold">Service settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paystack uses the Naira fee. PayPal uses the Dollar fee. Office
              coordinates enable AMap estimates; current intercity research uses
              OpenAI web search.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field
            label="Verification fee (₦)"
            type="number"
            value={settings.feeNaira}
            onChange={(v) =>
              setSettings((s) => ({ ...s, feeNaira: Number(v) }))
            }
          />
          <Field
            label="Verification fee ($)"
            type="number"
            value={settings.feeUsd}
            onChange={(v) => setSettings((s) => ({ ...s, feeUsd: Number(v) }))}
          />
          <Field
            label="Quote validity (days)"
            type="number"
            value={settings.quoteValidityDays}
            onChange={(v) =>
              setSettings((s) => ({ ...s, quoteValidityDays: Number(v) }))
            }
          />
          <Field
            label="Guangzhou office address (Chinese)"
            value={settings.officeAddressChinese}
            onChange={(v) =>
              setSettings((s) => ({ ...s, officeAddressChinese: String(v) }))
            }
          />
          <Field
            label="Office latitude"
            value={settings.officeLatitude}
            onChange={(v) =>
              setSettings((s) => ({ ...s, officeLatitude: String(v) }))
            }
          />
          <Field
            label="Office longitude"
            value={settings.officeLongitude}
            onChange={(v) =>
              setSettings((s) => ({ ...s, officeLongitude: String(v) }))
            }
          />
          <Field
            label="Online turnaround (days)"
            type="number"
            value={settings.onlineTurnaroundDays}
            onChange={(v) =>
              setSettings((s) => ({ ...s, onlineTurnaroundDays: Number(v) }))
            }
          />
          <Field
            label="Physical turnaround (days)"
            type="number"
            value={settings.physicalTurnaroundDays}
            onChange={(v) =>
              setSettings((s) => ({ ...s, physicalTurnaroundDays: Number(v) }))
            }
          />
          <Field
            label="Default decent hotel / night (¥)"
            type="number"
            value={settings.defaultLodgingCny}
            onChange={(v) =>
              setSettings((s) => ({ ...s, defaultLodgingCny: Number(v) }))
            }
          />
          <Field
            label="Travel contingency (%)"
            type="number"
            value={settings.travelContingencyPercent}
            onChange={(v) =>
              setSettings((s) => ({
                ...s,
                travelContingencyPercent: Number(v),
              }))
            }
          />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-5">
            <Toggle
              label="Online checks"
              checked={settings.onlineEnabled}
              onChange={(v) => setSettings((s) => ({ ...s, onlineEnabled: v }))}
            />
            <Toggle
              label="Physical visits"
              checked={settings.physicalEnabled}
              onChange={(v) =>
                setSettings((s) => ({ ...s, physicalEnabled: v }))
              }
            />
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={saveSettings}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}{" "}
            Save settings
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric
          label="All requests"
          value={initialRequests.length}
          icon={ClipboardList}
        />
        <Metric
          label="Quotes needed"
          value={
            initialRequests.filter(
              (item) =>
                item.verificationType === "PHYSICAL" &&
                verificationPaymentPaid(item) &&
                item.transportQuoteStatus === "PENDING",
            ).length
          }
          icon={MapPin}
        />
        <Metric
          label="Paid/in progress"
          value={
            initialRequests.filter((item) =>
              ["PAID", "IN_REVIEW", "VISIT_SCHEDULED"].includes(
                item.status || "",
              ),
            ).length
          }
          icon={Banknote}
        />
        <Metric
          label="Reports ready"
          value={
            initialRequests.filter((item) =>
              ["REPORT_READY", "COMPLETED"].includes(item.status || ""),
            ).length
          }
          icon={CheckCircle2}
        />
      </section>

      <section className="rounded-xl border border-border bg-card shadow-soft">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              aria-label="Search verifications"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search request, customer, supplier, phone, address or product…"
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            />
          </label>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ALL">All statuses</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((item) => (
            <RequestCard
              key={item.pidVerifySupplier}
              item={item}
              open={openId === item.pidVerifySupplier}
              setOpen={() =>
                setOpenId(
                  openId === item.pidVerifySupplier
                    ? null
                    : item.pidVerifySupplier,
                )
              }
              run={run}
              pending={pending}
              settings={settings}
              exchangeRates={exchangeRates}
            />
          ))}
          {filtered.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No matching requests.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

type TravelResearchOption = {
  mode: "HIGH_SPEED_RAIL" | "FLIGHT" | "PRIVATE_CAR";
  label: string;
  available: boolean;
  route: string;
  duration: string;
  intercityFareCny: number;
  localTransfersCny: number;
  lodgingNights: number;
  lodgingRateCny: number;
  contingencyCny: number;
  totalCny: number;
  notes: string;
  sourceUrls: string[];
};

type TravelResearchResult = {
  originAddressChinese: string;
  destinationAddressChinese: string;
  destinationResolved: string;
  oneWayDistanceKm: number;
  roundTripDistanceKm: number;
  recommendedMode: TravelResearchOption["mode"];
  recommendationRationale: string;
  researchSummary: string;
  options: TravelResearchOption[];
  sourceUrls: string[];
  pricingAsOf: string;
};

function AutomatedTravelResearch({
  defaultDestination,
  originAddressChinese,
  exchangeRates,
  requestId,
  initialResult,
  onComplete,
}: {
  defaultDestination: string;
  originAddressChinese: string;
  exchangeRates: ExchangeRates;
  requestId: string;
  initialResult?: TravelResearchResult | null;
  onComplete?: (result: TravelResearchResult) => void;
}) {
  const router = useRouter();
  const [destination, setDestination] = useState(defaultDestination);
  const [result, setResult] = useState<TravelResearchResult | null>(
    initialResult || null,
  );
  const [researching, startResearch] = useTransition();
  const icons = {
    HIGH_SPEED_RAIL: TrainFront,
    FLIGHT: Plane,
    PRIVATE_CAR: Car,
  };
  const selected = result?.options.find(
    (option) => option.mode === result.recommendedMode,
  );

  const runResearch = () =>
    startResearch(async () => {
      try {
        const researched = (await researchSupplierTravel({
          requestId,
          destinationAddressChinese: destination,
        })) as TravelResearchResult;
        setResult(researched);
        onComplete?.(researched);
        toast.success("Current travel and lodging research completed.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Travel research failed.",
        );
      }
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Info label="Origin" value={originAddressChinese} />
        <Field
          label="Supplier destination"
          value={destination}
          onChange={(value) => setDestination(String(value))}
        />
      </div>
      <button
        type="button"
        disabled={researching || destination.trim().length < 5}
        onClick={runResearch}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {researching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        {researching
          ? "Researching current routes and prices…"
          : "Research route & calculate"}
      </button>
      <p className="text-xs text-muted-foreground">
        Uses OpenAI web research and consumes API credits. Reconfirm prices
        before booking.
      </p>

      {result ? (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Info
              label="Resolved destination"
              value={result.destinationResolved}
            />
            <Info
              label="One-way distance"
              value={`${result.oneWayDistanceKm.toLocaleString()} km`}
            />
            <Info
              label="Round-trip distance"
              value={`${result.roundTripDistanceKm.toLocaleString()} km`}
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {result.options.map((option) => {
              const Icon = icons[option.mode];
              const recommended = option.mode === result.recommendedMode;
              return (
                <div
                  key={option.mode}
                  className={`rounded-lg border p-4 ${
                    recommended
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <Icon className="h-4 w-4" /> {option.label}
                    </span>
                    <span className="text-sm font-bold">
                      {option.available
                        ? `¥${option.totalCny.toLocaleString()}`
                        : "Unavailable"}
                    </span>
                  </div>
                  {recommended ? (
                    <span className="mt-2 inline-flex rounded-full bg-primary px-2 py-1 text-[10px] font-bold uppercase text-primary-foreground">
                      Recommended
                    </span>
                  ) : null}
                  <p className="mt-3 text-xs font-semibold">{option.route}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {option.duration}
                  </p>
                  <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <CostLine
                      label="Return fare"
                      value={option.intercityFareCny}
                    />
                    <CostLine
                      label="Local transfers"
                      value={option.localTransfersCny}
                    />
                    <div className="flex justify-between gap-3">
                      <dt>Hotel</dt>
                      <dd>
                        {option.lodgingNights} × ¥
                        {option.lodgingRateCny.toLocaleString()}
                      </dd>
                    </div>
                    <CostLine
                      label="Contingency"
                      value={option.contingencyCny}
                    />
                  </dl>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {option.notes}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-bold">Recommendation</p>
            <p className="mt-2 text-sm leading-6">
              {result.recommendationRationale}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {result.researchSummary}
            </p>
          </div>
          {selected ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <BedDouble className="h-4 w-4 text-primary" />
              <span className="font-bold">
                Selected all-in estimate: ¥{selected.totalCny.toLocaleString()}
              </span>
              <span className="text-muted-foreground">
                {exchangeRates.ngnPerCny > 0
                  ? `≈ ₦${Math.ceil(selected.totalCny * exchangeRates.ngnPerCny).toLocaleString()}`
                  : "NGN rate not configured"}
                {" · "}
                {exchangeRates.cnyPerUsd > 0
                  ? `≈ $${Math.ceil(selected.totalCny / exchangeRates.cnyPerUsd).toLocaleString()}`
                  : "USD/CNY rate not configured"}
              </span>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Research sources · priced {result.pricingAsOf}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.sourceUrls.map((url, index) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-primary"
                >
                  Source {index + 1} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CostLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd>¥{value.toLocaleString()}</dd>
    </div>
  );
}

function RequestCard({
  item,
  open,
  setOpen,
  run,
  pending,
  settings,
  exchangeRates,
}: {
  item: RequestItem;
  open: boolean;
  setOpen: () => void;
  run: (work: () => Promise<unknown>, success: string) => void;
  pending: boolean;
  settings: Settings;
  exchangeRates: ExchangeRates;
}) {
  const initialResearch =
    item.travelEstimateJson?.version === 2
      ? (item.travelEstimateJson as TravelResearchResult)
      : null;
  const initiallySelected = initialResearch?.options.find(
    (option) => option.mode === initialResearch.recommendedMode,
  );
  const [quote, setQuote] = useState({
    feeNaira: item.transportFeeNgnKobo
      ? item.transportFeeNgnKobo / 100
      : initiallySelected && exchangeRates.ngnPerCny > 0
        ? Math.ceil(initiallySelected.totalCny * exchangeRates.ngnPerCny)
        : "",
    feeUsd: item.transportFeeUsdCents
      ? item.transportFeeUsdCents / 100
      : initiallySelected && exchangeRates.cnyPerUsd > 0
        ? Math.ceil(initiallySelected.totalCny / exchangeRates.cnyPerUsd)
        : "",
    customerMessage: item.customerMessage || "",
  });
  const permittedNextStatuses = (nextStatuses[item.status || ""] || []).filter(
    (nextStatus) =>
      nextStatus !== "VISIT_SCHEDULED" ||
      (item.verificationType === "PHYSICAL" &&
        item.transportQuoteStatus === "PAID"),
  );
  const [progress, setProgress] = useState({
    status: permittedNextStatuses[0] || "",
    message: "",
    adminNotes: item.adminNotes || "",
  });
  const [report, setReport] = useState({
    outcome: item.reportOutcome || "CAUTION",
    summary: item.reportSummary || "",
    reportUrl: item.reportUrl || "",
  });
  const estimate = item.transportEstimateCnyFen
    ? `¥${(item.transportEstimateCnyFen / 100).toFixed(2)} all-in estimate`
    : "No saved travel plan";
  return (
    <article>
      <button
        type="button"
        onClick={setOpen}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">
            {item.supplierName || "Unnamed supplier"}{" "}
            {item.supplierNameChinese ? ` / ${item.supplierNameChinese}` : ""}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {item.pidVerifySupplier} ·{" "}
            {item.customerName || item.userEmail || "Legacy customer"} ·{" "}
            {item.verificationType}
          </span>
        </span>
        <span className="hidden rounded-full bg-muted px-3 py-1 text-xs font-bold sm:block">
          {labels[item.status || ""] || item.status}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="space-y-6 border-t border-border bg-muted/10 p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="English address" value={item.supplierAddress} />
            <Info label="Chinese address" value={item.supplierAddressChinese} />
            <Info label="Registration number" value={item.registrationNumber} />
            <Info label="Product" value={item.supplierProduct} />
            <Info
              label="Phone / WeChat"
              value={[item.supplierPhone, item.supplierWechat]
                .filter(Boolean)
                .join(" / ")}
            />
            <Info label="Website" value={item.supplierWebsite} link />
            <Info
              label="Payment"
              value={
                item.payments[0]
                  ? `${item.payments[0].currency} ${(item.payments[0].amountMinor / 100).toLocaleString()} · ${item.payments[0].status}`
                  : "Not started"
              }
            />
            <Info label="Assigned to" value={item.assignedTo || "Unassigned"} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Investigation brief
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
              {item.supplierDetails || "No brief provided."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://www.gsxt.gov.cn/index.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-bold text-primary"
            >
              Open China official company registry{" "}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {Array.isArray(item.marketplaceUrls)
              ? item.marketplaceUrls.map((url: string, index: number) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-bold"
                  >
                    Marketplace link {index + 1}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ))
              : null}
          </div>
          {item.verificationType === "PHYSICAL" &&
          !verificationPaymentPaid(item) ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Travel research is locked until the customer pays the standard
              verification fee. This prevents uncommitted requests from using
              OpenAI research credits.
            </div>
          ) : null}
          {item.verificationType === "PHYSICAL" &&
          verificationPaymentPaid(item) &&
          ["PENDING", "READY"].includes(item.transportQuoteStatus || "") ? (
            <Panel
              title="Travel & lodging plan"
              subtitle={`${estimate}${item.transportDistanceMeters ? ` · ${(item.transportDistanceMeters / 1000).toFixed(1)} km one way` : ""}`}
            >
              <AutomatedTravelResearch
                defaultDestination={
                  item.supplierAddressChinese || item.supplierAddress || ""
                }
                exchangeRates={exchangeRates}
                originAddressChinese={settings.officeAddressChinese}
                requestId={item.pidVerifySupplier}
                initialResult={initialResearch}
                onComplete={(result) => {
                  const selected = result.options.find(
                    (option) => option.mode === result.recommendedMode,
                  );
                  if (!selected) return;
                  setQuote({
                    feeNaira:
                      exchangeRates.ngnPerCny > 0
                        ? Math.ceil(selected.totalCny * exchangeRates.ngnPerCny)
                        : "",
                    feeUsd:
                      exchangeRates.cnyPerUsd > 0
                        ? Math.ceil(selected.totalCny / exchangeRates.cnyPerUsd)
                        : "",
                    customerMessage: `Your all-in travel and lodging quote is based on ${selected.label.toLowerCase()}, local transfers and ${selected.lodgingNights} hotel night(s).`,
                  });
                }}
              />
              <div className="my-5 border-t border-border" />
              <div className="grid gap-3 md:grid-cols-3">
                <Info
                  label="Calculated Paystack travel & lodging"
                  value={
                    quote.feeNaira === ""
                      ? "Run research first"
                      : `₦${Number(quote.feeNaira).toLocaleString()}`
                  }
                />
                <Info
                  label="Calculated PayPal travel & lodging"
                  value={
                    quote.feeUsd === ""
                      ? "Run research first"
                      : `$${Number(quote.feeUsd).toLocaleString()}`
                  }
                />
                <Field
                  label="Customer message"
                  value={quote.customerMessage}
                  onChange={(v) =>
                    setQuote((q) => ({ ...q, customerMessage: String(v) }))
                  }
                />
              </div>
              {quote.feeNaira !== "" && quote.feeUsd !== "" ? (
                <ActionButton
                  pending={pending}
                  label="Approve and publish quote"
                  onClick={() =>
                    run(
                      () =>
                        quoteSupplierTransport({
                          requestId: item.pidVerifySupplier,
                          ...quote,
                        }),
                      "Travel and lodging quote published.",
                    )
                  }
                />
              ) : (
                <p className="mt-4 text-xs font-semibold text-muted-foreground">
                  Complete the automated research before publishing a quote.
                </p>
              )}
            </Panel>
          ) : null}
          {permittedNextStatuses.length ? (
            <Panel
              title="Workflow update"
              subtitle="Only valid next steps are available."
            >
              <div className="grid gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold text-muted-foreground">
                    Next status
                  </span>
                  <select
                    value={progress.status}
                    onChange={(event) =>
                      setProgress((p) => ({ ...p, status: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {permittedNextStatuses.map((value) => (
                      <option key={value} value={value}>
                        {labels[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Customer message"
                  value={progress.message}
                  onChange={(v) =>
                    setProgress((p) => ({ ...p, message: String(v) }))
                  }
                />
                <Field
                  label="Internal notes"
                  value={progress.adminNotes}
                  onChange={(v) =>
                    setProgress((p) => ({ ...p, adminNotes: String(v) }))
                  }
                />
              </div>
              <ActionButton
                pending={pending}
                label="Update status"
                onClick={() =>
                  run(
                    () =>
                      updateSupplierVerification({
                        requestId: item.pidVerifySupplier,
                        ...progress,
                      }),
                    "Request status updated.",
                  )
                }
              />
            </Panel>
          ) : null}
          {["IN_REVIEW", "VISIT_SCHEDULED", "REPORT_READY"].includes(
            item.status || "",
          ) ? (
            <Panel
              title="Verification report"
              subtitle="Give an evidence-led conclusion. Avoid promising future supplier performance."
            >
              <div className="grid gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold text-muted-foreground">
                    Outcome
                  </span>
                  <select
                    value={report.outcome}
                    onChange={(event) =>
                      setReport((r) => ({ ...r, outcome: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="LOW_RISK">Low risk observed</option>
                    <option value="CAUTION">Proceed with caution</option>
                    <option value="HIGH_RISK">High risk</option>
                    <option value="INCONCLUSIVE">Inconclusive</option>
                  </select>
                </label>
                <Field
                  label="Secure report URL"
                  value={report.reportUrl}
                  onChange={(v) =>
                    setReport((r) => ({ ...r, reportUrl: String(v) }))
                  }
                />
                <label className="block md:col-span-3">
                  <span className="text-xs font-bold text-muted-foreground">
                    Customer summary
                  </span>
                  <textarea
                    value={report.summary}
                    onChange={(event) =>
                      setReport((r) => ({ ...r, summary: event.target.value }))
                    }
                    rows={5}
                    className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"
                  />
                </label>
              </div>
              <ActionButton
                pending={pending}
                label="Publish report"
                onClick={() =>
                  run(
                    () =>
                      publishSupplierVerificationReport({
                        requestId: item.pidVerifySupplier,
                        ...report,
                      }),
                    "Verification report published.",
                  )
                }
              />
            </Panel>
          ) : null}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Audit timeline
            </p>
            <ol className="mt-3 space-y-2">
              {item.events.map((event) => (
                <li
                  key={event.pidEvent}
                  className="border-l-2 border-border pl-3 text-xs"
                >
                  <span className="font-semibold">
                    {event.message || event.eventType}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()} ·{" "}
                    {event.visibility.toLowerCase()}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}
function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof ClipboardList;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-4 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
function Info({
  label,
  value,
  link = false,
}: {
  label: string;
  value: string | null;
  link?: boolean;
}) {
  const text = value || "—";
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {link && value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 break-all text-sm font-semibold text-primary"
        >
          {text}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <p className="mt-1 break-words text-sm font-semibold">{text}</p>
      )}
    </div>
  );
}
function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function ActionButton({
  pending,
  label,
  onClick,
}: {
  pending: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {label}
    </button>
  );
}
