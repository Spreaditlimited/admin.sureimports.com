import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  Briefcase,
  Calendar,
  MessageCircle,
  Mail,
  MapPin,
  Package,
  ExternalLink,
  FileText,
  Layers,
  Clock,
  Ban,
  ChevronDown,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CORPORATE_GIFT_STATUSES,
  getNextCorporateGiftStatus,
} from "@/lib/notifications/corporateGifts";
import {
  assignCorporateGiftRequestAction,
  updateCorporateGiftRequestAction,
  updateCorporateGiftRequestFormAction,
} from "./actions";
import Link from "next/link";
import CancelProjectCard from "./components/CancelProjectCard";
import ResearchFeeSettings from "./components/ResearchFeeSettings";
import { getCorporateSourcingPricing } from "@/lib/corporateSourcing/pricing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CorporateSourcingAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[]; status?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const first = (value: string | string[] | undefined) =>
    String(Array.isArray(value) ? value[0] || "" : value || "").trim();
  const query = first(params.q).slice(0, 160);
  const requestedStatus = first(params.status);
  const activeStatus = CORPORATE_GIFT_STATUSES.includes(
    requestedStatus as never,
  )
    ? requestedStatus
    : "";
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const sourceSiteUrl =
    process.env.SUREIMPORTS_SITE_URL || "https://www.sureimports.com";

  const entries = await prisma.corporate_gift_request.findMany({
    where: {
      ...(activeStatus ? { status: activeStatus } : {}),
      ...(searchTerms.length
        ? {
            AND: searchTerms.map((term) => ({
              OR: [
                { pidRequest: { contains: term } },
                { pidUser: { contains: term } },
                { businessName: { contains: term } },
                { contactPersonFullName: { contains: term } },
                { contactEmail: { contains: term } },
                { whatsappNumber: { contains: term } },
                { productOrItemNeeded: { contains: term } },
                { detailedSpecifications: { contains: term } },
                { finalDeliveryLocationNigeria: { contains: term } },
                { budgetRange: { contains: term } },
                { handledByName: { contains: term } },
              ],
            })),
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: query || activeStatus ? 250 : 100,
  });
  const researchFee = await getCorporateSourcingPricing();

  const requestIds = entries.map((entry) => entry.pidRequest);
  const paymentRows = requestIds.length
    ? await prisma.$queryRaw<
        Array<{
          requestId: string;
          paymentProvider: string;
          amountMinor: number;
          currency: string;
          paidAt: Date | null;
        }>
      >`
        SELECT requestId, paymentProvider, amountMinor, currency, paidAt
        FROM corporate_sourcing_research_payments
        WHERE requestId IN (${Prisma.join(requestIds)})
          AND status = 'paid'
      `.catch(() => [])
    : [];
  const paymentByRequestId = new Map(
    paymentRows.map((payment) => [payment.requestId, payment]),
  );
  const cancellationReasonRows = requestIds.length
    ? await prisma.$queryRaw<
        Array<{ pidRequest: string; cancellationReason: string | null }>
      >`
        SELECT pidRequest, cancellationReason
        FROM corporate_gift_request
        WHERE pidRequest IN (${Prisma.join(requestIds)})
      `
    : [];
  const cancellationReasonByRequestId = new Map(
    cancellationReasonRows.map((row) => [
      row.pidRequest,
      row.cancellationReason,
    ]),
  );
  const linkedInvoices = requestIds.length
    ? await prisma.invoices.findMany({
        where: { linkedRequestId: { in: requestIds } },
        select: {
          pidInvoice: true,
          linkedRequestId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const invoiceByRequestId = new Map<string, (typeof linkedInvoices)[number]>();
  linkedInvoices.forEach((invoice) => {
    if (
      invoice.linkedRequestId &&
      !invoiceByRequestId.has(invoice.linkedRequestId)
    ) {
      invoiceByRequestId.set(invoice.linkedRequestId, invoice);
    }
  });
  const linkedQuotations = requestIds.length
    ? await prisma.quotation_builder_documents.findMany({
        where: { linkedRequestId: { in: requestIds } },
        select: {
          pidQuotation: true,
          quotationNumber: true,
          linkedRequestId: true,
          status: true,
          lastSentAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const quotationByRequestId = new Map<
    string,
    (typeof linkedQuotations)[number]
  >();
  linkedQuotations.forEach((quotation) => {
    if (
      quotation.linkedRequestId &&
      !quotationByRequestId.has(quotation.linkedRequestId)
    ) {
      quotationByRequestId.set(quotation.linkedRequestId, quotation);
    }
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Corporate Sourcing Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review machinery, equipment, bulk product and branded sourcing
            enquiries from business clients.
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted/50 px-4 py-2 shadow-sm">
          <span className="text-sm font-semibold text-foreground">
            {entries.length} {query || activeStatus ? "Matching" : "Total"}{" "}
            Requests
          </span>
        </div>
      </div>

      <ResearchFeeSettings initialPricing={researchFee} />

      <form className="grid gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:p-4">
        <label className="relative min-w-0">
          <span className="sr-only">Search corporate sourcing requests</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search request, business, contact, phone or product…"
            className="min-h-11 w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label>
          <span className="sr-only">Filter by sourcing stage</span>
          <select
            name="status"
            defaultValue={activeStatus}
            className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All stages</option>
            {CORPORATE_GIFT_STATUSES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Search className="h-4 w-4" /> Search
        </button>
      </form>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-20 text-center shadow-soft">
          <Package className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            {query || activeStatus ? "No matching requests" : "No requests yet"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {query || activeStatus
              ? "Try a different search or select another stage."
              : "New sourcing requests will appear here as they come in."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {entries.map((entry) => {
            const entryView = entry as typeof entry & {
              status?: string;
              handledByName?: string | null;
            };
            const cancellationReason =
              cancellationReasonByRequestId.get(entry.pidRequest) || null;
            const entryStatus = entryView.status || "Pending";
            const nextStatus = getNextCorporateGiftStatus(entryStatus);
            const canCancel =
              entryStatus !== "Delivered" && entryStatus !== "Cancelled";
            const linkedInvoice = invoiceByRequestId.get(entry.pidRequest);
            const linkedQuotation = quotationByRequestId.get(entry.pidRequest);
            const researchPayment = paymentByRequestId.get(entry.pidRequest);
            const invoiceHref = linkedInvoice
              ? `/dashboard/invoicing/${linkedInvoice.pidInvoice}`
              : linkedQuotation
                ? `/dashboard/invoicing/create?pidQuotation=${encodeURIComponent(linkedQuotation.pidQuotation)}&linkedRequestId=${encodeURIComponent(entry.pidRequest)}`
                : "";
            const invoiceLabel = linkedInvoice
              ? "Manage Invoice"
              : "Create Invoice";

            return (
              <div
                key={entry.id}
                className={`bg-card shadow-soft rounded-lg overflow-hidden transition-all duration-200 ${
                  entryStatus === "Cancelled"
                    ? "border-2 border-red-600"
                    : "border border-border"
                }`}
              >
                <details className="group">
                  {entryStatus === "Cancelled" && (
                    <div className="border-b border-red-700 bg-red-700 px-5 py-3 text-white sm:px-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <Ban className="h-5 w-5" />
                        <span className="text-sm font-black uppercase tracking-[0.24em]">
                          Cancelled
                        </span>
                        <span className="rounded bg-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red-700">
                          {entry.pidRequest}
                        </span>
                      </div>
                    </div>
                  )}
                  <summary className="flex cursor-pointer list-none flex-col gap-4 px-5 py-4 transition-colors hover:bg-muted/40 marker:hidden sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-base font-bold text-foreground">
                            {entry.businessName}
                          </h2>
                          <Badge
                            variant="outline"
                            className="border-border bg-background text-foreground text-xs"
                          >
                            {entryStatus}
                          </Badge>
                          {researchPayment ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            >
                              Research Fee Paid
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {entry.productOrItemNeeded}
                          </span>
                          <span>•</span>
                          <span>{entry.quantityNeeded} units</span>
                          <span>•</span>
                          <span>{entry.expectedDeliveryDate}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span className="font-mono">
                            ID: {entry.pidRequest}
                          </span>
                          {researchPayment ? (
                            <span>
                              {researchPayment.currency === "NGN" ? "₦" : "$"}
                              {(
                                researchPayment.amountMinor / 100
                              ).toLocaleString(undefined, {
                                minimumFractionDigits:
                                  researchPayment.currency === "USD" ? 2 : 0,
                                maximumFractionDigits:
                                  researchPayment.currency === "USD" ? 2 : 0,
                              })}
                              {" · "}
                              {researchPayment.paymentProvider}
                            </span>
                          ) : null}
                          <span>
                            Handler: {entryView.handledByName || "Unassigned"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:justify-end">
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <span className="group-open:hidden">Open</span>
                        <span className="hidden group-open:inline">Close</span>
                      </span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-transform group-open:rotate-180">
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-border p-5 sm:p-6">
                    {/* Card Header: Title & Quick Contact */}
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50">
                          <Briefcase className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-foreground">
                            {entry.businessName}
                          </h2>
                          <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                            Contact: {entry.contactPersonFullName}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(entry.createdAt).toLocaleString("en-NG", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                            <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                              ID: {entry.pidRequest}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={`https://wa.me/${entry.whatsappNumber.replace(/\D/g, "")}`}
                          target="_blank"
                          className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                        <a
                          href={`mailto:${entry.contactEmail}`}
                          className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <Mail className="h-3.5 w-3.5" /> Email
                        </a>
                      </div>
                    </div>

                    {/* Core Request Data Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 border-y border-border py-5">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <Package className="h-3 w-3" /> Product or Machine
                          Needed
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {entry.productOrItemNeeded}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <Layers className="h-3 w-3" /> Quantity / Quality or
                          Duty
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {entry.quantityNeeded} units •{" "}
                          {entry.preferredQualityLevel}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <Calendar className="h-3 w-3" /> Delivery Goal
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {entry.expectedDeliveryDate}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <MapPin className="h-3 w-3" /> Location
                        </span>
                        <span className="text-sm font-semibold text-foreground truncate">
                          {entry.finalDeliveryLocationNigeria}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Specs & Notes */}
                    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="rounded-lg border border-border bg-background p-4">
                        <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" /> Detailed
                          Specifications
                        </h4>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {entry.detailedSpecifications}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col gap-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Requirement Checklist
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant="outline"
                              className="border-border bg-background text-foreground text-xs px-2.5 py-0.5"
                            >
                              Branding / Customization:{" "}
                              {entry.brandingCustomizationRequired}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="border-border bg-background text-foreground text-xs px-2.5 py-0.5"
                            >
                              Timeline: {entry.proceedTimeline || "Unstated"}
                            </Badge>
                          </div>
                        </div>

                        {entry.additionalNotes && (
                          <div className="rounded-lg border border-border bg-muted/50 p-4">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Additional Notes
                            </p>
                            <p className="text-sm italic leading-relaxed text-foreground">
                              {entry.additionalNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Attached Files & UTM Data */}
                    <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="grid w-full grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:w-auto lg:flex lg:gap-3">
                        {entry.referenceFileUrl && (
                          <a
                            href={
                              entry.referenceFileUrl.startsWith("http")
                                ? entry.referenceFileUrl
                                : `${sourceSiteUrl}${entry.referenceFileUrl}`
                            }
                            target="_blank"
                            className="flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 font-medium text-primary transition-colors hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              Reference / Spec:{" "}
                              {entry.referenceFileName || "View"}
                            </span>
                          </a>
                        )}
                        {entry.logoFileUrl && (
                          <a
                            href={
                              entry.logoFileUrl.startsWith("http")
                                ? entry.logoFileUrl
                                : `${sourceSiteUrl}${entry.logoFileUrl}`
                            }
                            target="_blank"
                            className="flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 font-medium text-primary transition-colors hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              Company Logo: {entry.logoFileName || "View"}
                            </span>
                          </a>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 font-mono text-[10px] text-muted-foreground sm:gap-3">
                        <span>Source: {entry.utmSource || "direct"}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Medium: {entry.utmMedium || "organic"}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Campaign: {entry.utmCampaign || "n/a"}</span>
                      </div>
                    </div>

                    {/* Status & Administrative Actions */}
                    <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Status:
                            </span>
                            <Badge
                              variant="outline"
                              className="border-border bg-background text-foreground text-xs"
                            >
                              {entryStatus}
                            </Badge>
                            <span className="text-xs font-medium text-muted-foreground sm:border-l sm:border-border sm:pl-2 sm:ml-2">
                              Handler:{" "}
                              <span className="text-foreground">
                                {entryView.handledByName || "Unassigned"}
                              </span>
                            </span>
                          </div>
                          {entryStatus === "Cancelled" && (
                            <div className="mt-2 rounded-md border-2 border-red-300 bg-red-50 p-3 text-red-950 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-700 dark:text-red-300">
                                Cancellation Reason
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-relaxed">
                                {cancellationReason || "Not provided"}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-3 lg:gap-3">
                          {linkedInvoice || linkedQuotation?.lastSentAt ? (
                            <Link
                              href={invoiceHref}
                              className="w-full text-center rounded-md bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-card"
                            >
                              {invoiceLabel}
                            </Link>
                          ) : (
                            <Link
                              href={`/dashboard/invoicing/quotation-builder?linkedRequestId=${encodeURIComponent(entry.pidRequest)}#quotation-history`}
                              className="w-full text-center rounded-md bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-card"
                            >
                              {linkedQuotation
                                ? "View and Send Quote"
                                : "Create Quote"}
                            </Link>
                          )}

                          <form
                            action={assignCorporateGiftRequestAction}
                            className="w-full"
                          >
                            <input
                              type="hidden"
                              name="pidRequest"
                              value={entry.pidRequest}
                            />
                            <button
                              type="submit"
                              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-card"
                            >
                              Assign To Me
                            </button>
                          </form>

                          <form
                            action={updateCorporateGiftRequestFormAction}
                            className="w-full"
                          >
                            <input
                              type="hidden"
                              name="pidRequest"
                              value={entry.pidRequest}
                            />
                            {nextStatus === "Sourced" ? (
                              <span className="flex min-h-[38px] w-full items-center justify-center rounded-md border border-border bg-muted/50 px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                                Send quote to mark Sourced
                              </span>
                            ) : nextStatus === "Invoiced" ? (
                              <span className="flex min-h-[38px] w-full items-center justify-center rounded-md border border-border bg-muted/50 px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                                Awaiting invoice
                              </span>
                            ) : nextStatus ? (
                              <>
                                <input
                                  type="hidden"
                                  name="status"
                                  value={nextStatus}
                                />
                                <button
                                  type="submit"
                                  className="w-full rounded-md bg-foreground px-4 py-2.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-card"
                                >
                                  Move to {nextStatus}
                                </button>
                              </>
                            ) : (
                              <span className="text-xs font-semibold text-muted-foreground w-full text-center">
                                Final status reached
                              </span>
                            )}
                          </form>
                        </div>
                      </div>
                    </div>

                    {canCancel && (
                      <div className="mt-4">
                        <CancelProjectCard
                          pidRequest={entry.pidRequest}
                          action={updateCorporateGiftRequestAction}
                        />
                      </div>
                    )}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
