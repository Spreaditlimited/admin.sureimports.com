import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  Search,
  UserRound,
  Video,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { getConsultationsAdminAccess } from "@/lib/consultationAccess";
import { prisma } from "@/lib/prisma";
import {
  reconcileConsultationBookingAction,
  updateConsultationBookingAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ConsultationBooking = {
  pidBooking: string;
  fullName: string;
  email: string;
  phone: string | null;
  businessName: string | null;
  consultationGoal: string | null;
  slotStartUtc: Date;
  slotEndUtc: Date;
  durationMinutes: number;
  status: string;
  amountKobo: number;
  currency: string;
  paystackReference: string | null;
  paystackCustomerCode: string | null;
  paidAt: Date | null;
  paymentVerifiedAt: Date | null;
  zoomMeetingId: string | null;
  zoomJoinUrl: string | null;
  zoomStartUrl: string | null;
  assignedOwner: string | null;
  callOutcomeStatus: string | null;
  outcomeFeedback: string | null;
  nextFollowUpAt: Date | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
  customerEmailSentAt: Date | null;
  adminEmailSentAt: Date | null;
  fulfillmentError: string | null;
  lastReconciledAt: Date | null;
  createdAt: Date;
};

function formatDate(date: Date | null) {
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(date);
}

function formatMoney(kobo: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(kobo / 100));
}

function statusClass(status: string) {
  if (status === "booked")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "pending_payment")
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (status === "cancelled")
    return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300";
  if (status.includes("failed") || status === "payment_conflict")
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
}

function shouldOpenByDefault(booking: ConsultationBooking) {
  const isUpcoming =
    ["booked", "rescheduled"].includes(booking.status) &&
    booking.slotStartUtc >= new Date();
  return isUpcoming || isPaymentOrZoomIssue(booking);
}

function isPaymentOrZoomIssue(booking: ConsultationBooking) {
  const status = booking.status.toLowerCase();
  const hasFailedStatus = status.includes("failed") || status === "zoom_failed";
  const bookedWithoutZoom =
    ["booked", "rescheduled"].includes(status) &&
    (!booking.zoomStartUrl || !booking.zoomJoinUrl);

  return (
    hasFailedStatus ||
    bookedWithoutZoom ||
    status === "pending_payment" ||
    status === "fulfilling" ||
    Boolean(booking.fulfillmentError)
  );
}

function canReconcileBooking(booking: ConsultationBooking) {
  return (
    ["pending_payment", "payment_failed", "zoom_failed", "fulfilling"].includes(
      booking.status,
    ) ||
    (["booked", "rescheduled"].includes(booking.status) &&
      (!booking.zoomStartUrl ||
        !booking.zoomJoinUrl ||
        !booking.customerEmailSentAt ||
        !booking.adminEmailSentAt))
  );
}

function isPastCall(booking: ConsultationBooking, now = new Date()) {
  const status = booking.status.toLowerCase();
  return (
    booking.slotStartUtc < now ||
    status === "completed" ||
    status === "no_show" ||
    status === "cancelled"
  );
}

function isUpcomingCall(booking: ConsultationBooking, now = new Date()) {
  const status = booking.status.toLowerCase();
  return (
    !isPaymentOrZoomIssue(booking) &&
    booking.slotStartUtc >= now &&
    ["booked", "rescheduled", "follow_up"].includes(status)
  );
}

type ConsultationView = "upcoming" | "past" | "issues";

function normalizeView(value: string | string[] | undefined): ConsultationView {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "past" || candidate === "issues") return candidate;
  return "upcoming";
}

export default async function ConsultationsAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string | string[]; q?: string | string[] }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const adminAccess = await getConsultationsAdminAccess();
  if (!adminAccess) redirect("/auth/login");
  if (!adminAccess.canView) redirect("/dashboard");
  const activeView = normalizeView(resolvedSearchParams.view);
  const query = String(
    Array.isArray(resolvedSearchParams.q)
      ? resolvedSearchParams.q[0] || ""
      : resolvedSearchParams.q || "",
  )
    .trim()
    .slice(0, 160);
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const searchClause = searchTerms.length
    ? Prisma.sql`WHERE ${Prisma.join(
        searchTerms.map(
          (term) => Prisma.sql`LOWER(CONCAT_WS(' ',
            pidBooking, fullName, email, phone, businessName, consultationGoal,
            status, paystackReference, paystackCustomerCode, zoomMeetingId,
            assignedOwner, callOutcomeStatus, outcomeFeedback, fulfillmentError
          )) LIKE ${`%${term}%`}`,
        ),
        " AND ",
      )}`
    : Prisma.empty;
  const bookings = await prisma.$queryRaw<ConsultationBooking[]>`
    SELECT
      pidBooking,
      fullName,
      email,
      phone,
      businessName,
      consultationGoal,
      slotStartUtc,
      slotEndUtc,
      durationMinutes,
      status,
      amountKobo,
      currency,
      paystackReference,
      paystackCustomerCode,
      paidAt,
      paymentVerifiedAt,
      zoomMeetingId,
      zoomJoinUrl,
      zoomStartUrl,
      assignedOwner,
      callOutcomeStatus,
      outcomeFeedback,
      nextFollowUpAt,
      cancelReason,
      cancelledAt,
      customerEmailSentAt,
      adminEmailSentAt,
      fulfillmentError,
      lastReconciledAt,
      createdAt
    FROM consultation_bookings
    ${searchClause}
    ORDER BY
      CASE
        WHEN status IN ('booked', 'rescheduled') AND slotStartUtc >= NOW() THEN 1
        WHEN status = 'zoom_failed' THEN 2
        WHEN status = 'pending_payment' THEN 3
        WHEN status = 'booked' THEN 4
        ELSE 5
      END,
      slotStartUtc ASC
    LIMIT ${query ? 300 : 120}
  `;

  const now = new Date();
  const upcomingCount = bookings.filter((booking) =>
    isUpcomingCall(booking, now),
  ).length;
  const pastCount = bookings.filter(
    (booking) => isPastCall(booking, now) && !isPaymentOrZoomIssue(booking),
  ).length;
  const issueCount = bookings.filter((booking) =>
    isPaymentOrZoomIssue(booking),
  ).length;
  const visibleBookings = bookings.filter((booking) => {
    if (activeView === "past")
      return isPastCall(booking, now) && !isPaymentOrZoomIssue(booking);
    if (activeView === "issues") return isPaymentOrZoomIssue(booking);
    return isUpcomingCall(booking, now);
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Consultation Bookings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage paid calls, Zoom links, customer goals and follow-up
            outcomes.
          </p>
        </div>
        <a
          href="https://www.sureimports.com/book-consultation"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          Public booking page
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            key: "upcoming",
            label: "Upcoming Calls",
            description: "Booked calls that are still ahead.",
            value: upcomingCount,
            icon: CalendarClock,
            href: `/dashboard/consultations?view=upcoming${query ? `&q=${encodeURIComponent(query)}` : ""}`,
          },
          {
            key: "past",
            label: "Past Calls",
            description: "Completed, cancelled, no-show, or elapsed calls.",
            value: pastCount,
            icon: Clock,
            href: `/dashboard/consultations?view=past${query ? `&q=${encodeURIComponent(query)}` : ""}`,
          },
          {
            key: "issues",
            label: "Payment/Zoom Issues",
            description:
              "Failed payment/Zoom records or booked calls missing Zoom links.",
            value: issueCount,
            icon: XCircle,
            href: `/dashboard/consultations?view=issues${query ? `&q=${encodeURIComponent(query)}` : ""}`,
          },
        ].map((stat) => (
          <Link
            key={stat.key}
            href={stat.href}
            className={`rounded-lg border p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg ${
              activeView === stat.key
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:bg-muted/40"
            }`}
          >
            <stat.icon className="h-5 w-5 text-muted-foreground" />
            <p className="mt-4 text-2xl font-bold text-foreground">
              {stat.value}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {stat.description}
            </p>
          </Link>
        ))}
      </div>

      <form className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:p-4">
        <input type="hidden" name="view" value={activeView} />
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search consultations in this stage</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search booking ID, customer, phone, business, status or payment reference…"
            className="min-h-11 w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Search className="h-4 w-4" /> Search
        </button>
      </form>

      {visibleBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-20 text-center shadow-soft">
          <CalendarClock className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            {query
              ? "No consultations match your search"
              : `No ${activeView === "issues" ? "consultation issues" : `${activeView} calls`} found`}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeView === "issues"
              ? "Payment and Zoom exceptions will appear here when they need attention."
              : "Consultation bookings for this view will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {visibleBookings.map((booking) => (
            <div
              key={booking.pidBooking}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-soft transition-all duration-200"
            >
              <details className="group" open={shouldOpenByDefault(booking)}>
                <summary className="flex cursor-pointer list-none flex-col gap-4 px-5 py-4 transition-colors hover:bg-muted/40 marker:hidden sm:px-6 lg:flex-row lg:items-center lg:justify-between [&::-webkit-details-marker]:hidden">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold text-foreground">
                          {booking.fullName}
                        </h2>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${statusClass(
                            booking.status,
                          )}`}
                        >
                          {booking.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {formatDate(booking.slotStartUtc)}
                        </span>
                        <span>•</span>
                        <span>{booking.durationMinutes} minutes</span>
                        {booking.businessName ? (
                          <>
                            <span>•</span>
                            <span>{booking.businessName}</span>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span className="font-mono">
                          ID: {booking.pidBooking}
                        </span>
                        <span>{booking.email}</span>
                        <span>
                          Owner: {booking.assignedOwner || "Unassigned"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <div className="hidden flex-wrap gap-2 xl:flex">
                      <a
                        href={`mailto:${booking.email}`}
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                      {booking.zoomStartUrl ? (
                        <a
                          href={booking.zoomStartUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Start Zoom
                        </a>
                      ) : null}
                    </div>

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
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50">
                        <CalendarClock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          {booking.fullName}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(booking.slotStartUtc)}
                          <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                            ID: {booking.pidBooking}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`mailto:${booking.email}`}
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                      {booking.zoomStartUrl ? (
                        <a
                          href={booking.zoomStartUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Start Zoom
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Info label="Email" value={booking.email} />
                        <Info
                          label="Phone / WhatsApp"
                          value={booking.phone}
                          icon={Phone}
                        />
                        <Info label="Business" value={booking.businessName} />
                        <Info
                          label="Amount paid"
                          value={formatMoney(
                            booking.amountKobo,
                            booking.currency,
                          )}
                        />
                        <Info
                          label="Paid at"
                          value={formatDate(booking.paidAt)}
                        />
                        <Info
                          label="Payment verified"
                          value={formatDate(booking.paymentVerifiedAt)}
                        />
                        <Info
                          label="Paystack reference"
                          value={booking.paystackReference}
                        />
                        <Info
                          label="Paystack customer"
                          value={booking.paystackCustomerCode}
                        />
                        <Info
                          label="Zoom meeting ID"
                          value={booking.zoomMeetingId}
                        />
                        <Info
                          label="Assigned owner"
                          value={booking.assignedOwner}
                          icon={UserRound}
                        />
                        <Info
                          label="Next follow-up"
                          value={formatDate(booking.nextFollowUpAt)}
                        />
                        <Info
                          label="Customer email sent"
                          value={formatDate(booking.customerEmailSentAt)}
                        />
                        <Info
                          label="Admin email sent"
                          value={formatDate(booking.adminEmailSentAt)}
                        />
                        <Info
                          label="Last reconciled"
                          value={formatDate(booking.lastReconciledAt)}
                        />
                      </div>

                      <Block
                        label="Customer goal"
                        value={booking.consultationGoal}
                        important
                      />
                      <Block
                        label="Outcome notes"
                        value={booking.outcomeFeedback}
                      />
                      <Block
                        label="Cancel reason"
                        value={booking.cancelReason}
                      />
                      <Block
                        label="Fulfillment issue"
                        value={booking.fulfillmentError}
                        important
                      />

                      {booking.zoomJoinUrl ? (
                        <a
                          href={booking.zoomJoinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                        >
                          Customer Zoom join link
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>

                    <form
                      action={updateConsultationBookingAction}
                      className="rounded-lg border border-border bg-background p-4"
                    >
                      <input
                        type="hidden"
                        name="pidBooking"
                        value={booking.pidBooking}
                      />
                      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        Manage booking
                      </h3>

                      <label className="mt-4 block">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Booking status
                        </span>
                        <select
                          name="status"
                          defaultValue={booking.status}
                          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                          <option value="booked">Booked</option>
                          <option value="rescheduled">Rescheduled</option>
                          <option value="completed">Completed</option>
                          <option value="no_show">No show</option>
                          <option value="follow_up">Follow up</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="zoom_failed">Zoom failed</option>
                          <option value="payment_failed">Payment failed</option>
                          <option value="payment_conflict">
                            Payment conflict
                          </option>
                          <option value="pending_payment">
                            Pending payment
                          </option>
                          <option value="fulfilling">Fulfilling</option>
                        </select>
                      </label>

                      <label className="mt-4 block">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Assigned owner
                        </span>
                        <input
                          name="assignedOwner"
                          defaultValue={booking.assignedOwner || ""}
                          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          placeholder="Team member handling this call"
                        />
                      </label>

                      <label className="mt-4 block">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Call outcome
                        </span>
                        <select
                          name="callOutcomeStatus"
                          defaultValue={booking.callOutcomeStatus || ""}
                          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Not set</option>
                          <option value="completed">Completed</option>
                          <option value="won">Converted to paid service</option>
                          <option value="lost">Not a fit</option>
                          <option value="follow_up">Needs follow up</option>
                          <option value="no_show">No show</option>
                        </select>
                      </label>

                      <label className="mt-4 block">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Next follow-up
                        </span>
                        <input
                          name="nextFollowUpAt"
                          type="datetime-local"
                          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="mt-4 block">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Outcome notes
                        </span>
                        <textarea
                          name="outcomeFeedback"
                          rows={5}
                          defaultValue={booking.outcomeFeedback || ""}
                          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          placeholder="What was discussed, what was promised, next paid service, risks, or follow-up action."
                        />
                      </label>

                      <label className="mt-4 block">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Cancel reason
                        </span>
                        <textarea
                          name="cancelReason"
                          rows={3}
                          defaultValue={booking.cancelReason || ""}
                          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          placeholder="Required only if cancelling."
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={!adminAccess.canEdit}
                        className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                      >
                        {adminAccess.canEdit ? "Save booking" : "View only"}
                      </button>

                      {adminAccess.canEdit && canReconcileBooking(booking) ? (
                        <button
                          type="submit"
                          formAction={reconcileConsultationBookingAction}
                          className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
                        >
                          Retry payment / Zoom fulfillment
                        </button>
                      ) : null}
                    </form>
                  </div>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null;
  icon?: typeof Phone;
}) {
  if (!value) return null;
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function Block({
  label,
  value,
  important = false,
}: {
  label: string;
  value: string | null;
  important?: boolean;
}) {
  if (!value) return null;
  return (
    <div
      className={`rounded-md border p-4 ${
        important
          ? "border-brand-orange-500/20 bg-brand-orange-500/10"
          : "border-border bg-background"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
        {value}
      </p>
    </div>
  );
}
