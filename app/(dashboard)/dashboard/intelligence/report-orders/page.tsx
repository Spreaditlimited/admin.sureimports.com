import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Mail,
  RefreshCw,
  Search,
  ShieldOff,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/app/api/invoicing/_lib/invoicing";
import { prisma } from "@/lib/prisma";
import { updateReportOrderAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
  }).format(amountMinor / 100);
}

function date(value: Date | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function statusClass(status: string) {
  if (status === "paid")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["pending", "expired"].includes(status))
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (["refunded", "reversed", "revoked", "disputed"].includes(status))
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300";
}

export default async function ReportOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string | string[];
    q?: string | string[];
  }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/auth/login");
  const params = searchParams ? await searchParams : {};
  const status = one(params.status);
  const query = one(params.q).trim().slice(0, 160);
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const where = {
    ...(status ? { status } : {}),
    ...(searchTerms.length
      ? {
          AND: searchTerms.map((term) => ({
            OR: [
              { pidOrder: { contains: term } },
              { pidUser: { contains: term } },
              { email: { contains: term } },
              { firstName: { contains: term } },
              { lastName: { contains: term } },
              { billingCountry: { contains: term } },
              { paymentProvider: { contains: term } },
              { providerReference: { contains: term } },
              { providerCaptureReference: { contains: term } },
              { reportId: { contains: term } },
              { versionId: { contains: term } },
              { fulfillmentError: { contains: term } },
            ],
          })),
        }
      : {}),
  };

  const [orders, grouped, issueCount] = await Promise.all([
    prisma.intelligence_report_orders.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.intelligence_report_orders.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.intelligence_report_orders.count({
      where: {
        OR: [
          { status: { in: ["disputed", "reversed", "revoked"] } },
          { status: "paid", fulfilledAt: null },
          { fulfillmentError: { not: null } },
        ],
      },
    }),
  ]);
  const [reports, versions, events] = await Promise.all([
    prisma.intelligence_report_products.findMany({
      where: { pidReport: { in: orders.map((order) => order.reportId) } },
    }),
    prisma.intelligence_report_versions.findMany({
      where: { pidVersion: { in: orders.map((order) => order.versionId) } },
    }),
    prisma.intelligence_report_order_events.findMany({
      where: { orderId: { in: orders.map((order) => order.pidOrder) } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const count = (key: string) =>
    grouped.find((item) => item.status === key)?._count._all || 0;

  return (
    <main className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Supplier Intelligence
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            Report orders
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Trace payments, delivery, downloads and access exceptions from the
            public checkout through fulfilment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/intelligence/reports"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Manage reports
          </Link>
          <a
            href="https://www.sureimports.com/supplier-intelligence/reports"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Public catalogue <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Paid", value: count("paid"), icon: CheckCircle2 },
          { label: "Pending", value: count("pending"), icon: ShoppingBag },
          { label: "Refunded", value: count("refunded"), icon: ShieldOff },
          { label: "Needs attention", value: issueCount, icon: AlertTriangle },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-5 shadow-soft"
          >
            <stat.icon className="h-5 w-5 text-muted-foreground" />
            <p className="mt-4 text-2xl font-bold text-foreground">
              {stat.value}
            </p>
            <p className="text-sm font-semibold text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <form className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-soft sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search order, customer, country, report or payment reference…"
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="">All statuses</option>
          {[
            "pending",
            "paid",
            "failed",
            "expired",
            "disputed",
            "revoked",
            "reversed",
            "refunded",
          ].map((item) => (
            <option key={item} value={item}>
              {item.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Filter
        </button>
      </form>

      {orders.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border bg-card p-16 text-center shadow-soft">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            No report orders found
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            New checkout records will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const report = reports.find(
              (item) => item.pidReport === order.reportId,
            );
            const version = versions.find(
              (item) => item.pidVersion === order.versionId,
            );
            const orderEvents = events
              .filter((event) => event.orderId === order.pidOrder)
              .slice(0, 8);
            const needsDelivery = order.status === "paid" && !order.fulfilledAt;
            return (
              <details
                key={order.pidOrder}
                open={needsDelivery || Boolean(order.fulfillmentError)}
                className="group overflow-hidden rounded-lg border border-border bg-card shadow-soft"
              >
                <summary className="flex cursor-pointer list-none flex-col gap-4 px-5 py-4 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-bold text-foreground">
                        {report?.title || order.reportId}
                      </h2>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${statusClass(order.status)}`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </span>
                      {needsDelivery ? (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700">
                          Delivery pending
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {order.email} · {version?.editionLabel || order.versionId}
                    </p>
                    <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {order.pidOrder} · {order.paymentProvider} ·{" "}
                      {money(order.amountMinor, order.currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {date(order.createdAt)}
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background transition-transform group-open:rotate-180">
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </div>
                </summary>

                <div className="border-t border-border p-5 sm:p-6">
                  <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                    <div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          [
                            "Customer",
                            `${order.firstName || ""} ${order.lastName || ""}`.trim() ||
                              "Not supplied",
                          ],
                          ["Email", order.email],
                          ["Country", order.billingCountry || "Not supplied"],
                          [
                            "Provider reference",
                            order.providerReference || "Not created",
                          ],
                          [
                            "Capture reference",
                            order.providerCaptureReference || "Not captured",
                          ],
                          ["Paid", date(order.paidAt)],
                          ["Delivered", date(order.fulfilledAt)],
                          [
                            "Delivery attempts",
                            String(order.fulfillmentAttempts),
                          ],
                          ["Downloads", String(order.downloadCount)],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-md border border-border bg-background p-3"
                          >
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {label}
                            </p>
                            <p className="mt-1 break-words text-sm font-semibold text-foreground">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {order.fulfillmentError || order.revocationReason ? (
                        <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
                          {order.fulfillmentError || order.revocationReason}
                        </div>
                      ) : null}

                      <div className="mt-6">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Audit trail
                        </h3>
                        <div className="mt-3 space-y-2">
                          {orderEvents.length ? (
                            orderEvents.map((event) => (
                              <div
                                key={event.pidEvent}
                                className="flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
                              >
                                <span className="font-semibold text-foreground">
                                  {event.eventType.replace(/_/g, " ")}
                                </span>
                                <span className="text-muted-foreground">
                                  {event.source} · {date(event.createdAt)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No lifecycle events recorded yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                      <h3 className="text-sm font-bold text-foreground">
                        Order controls
                      </h3>
                      <a
                        href={`mailto:${order.email}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                      >
                        <Mail className="h-4 w-4" /> Email customer
                      </a>
                      {order.status === "paid" ? (
                        <form action={updateReportOrderAction}>
                          <input
                            type="hidden"
                            name="pidOrder"
                            value={order.pidOrder}
                          />
                          <button
                            name="action"
                            value="retry_delivery"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                          >
                            <RefreshCw className="h-4 w-4" /> Rotate link &
                            resend
                          </button>
                        </form>
                      ) : null}
                      <form
                        action={updateReportOrderAction}
                        className="space-y-2"
                      >
                        <input
                          type="hidden"
                          name="pidOrder"
                          value={order.pidOrder}
                        />
                        <textarea
                          name="reason"
                          required
                          placeholder="Required audit reason or external refund reference"
                          className="min-h-20 w-full rounded-md border border-border bg-card p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                          {["revoked", "disputed"].includes(order.status) &&
                          !order.refundedAt ? (
                            <button
                              name="action"
                              value="restore"
                              className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700"
                            >
                              Restore reviewed access
                            </button>
                          ) : null}
                          {!["refunded", "reversed"].includes(order.status) ? (
                            <button
                              name="action"
                              value="revoke"
                              className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700"
                            >
                              Revoke access
                            </button>
                          ) : null}
                          {!["refunded", "reversed"].includes(order.status) ? (
                            <button
                              name="action"
                              value="confirm_refund"
                              className="rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                            >
                              Confirm external refund
                            </button>
                          ) : null}
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </main>
  );
}
