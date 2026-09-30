"use client";
import {
  DEFAULT_PLAN_SETTINGS,
  planSchedule,
  moneyMinor,
  type PlanSettings,
  type VehiclePlan,
} from "@/lib/vehicles/installments";
import { refundAmounts } from "@/lib/vehicles/refunds";
import { naira } from "@/lib/vehicles/policy";
type Action = (url: string, body: unknown) => Promise<boolean>;
export function VehiclePlanSettings({
  settings = DEFAULT_PLAN_SETTINGS,
  busy,
  canEdit,
  action,
}: {
  settings?: PlanSettings;
  busy: boolean;
  canEdit: boolean;
  action: Action;
}) {
  return (
    <form
      className="va-panel"
      key={settings.revision}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void action("/api/vehicles/plan-settings", {
          enabled: f.get("enabled") === "on",
          depositPercent: Number(f.get("deposit")),
          feePercent: Number(f.get("fee")),
          durationDays: Number(f.get("days")),
          revision: settings.revision,
          refundBusinessDays: Number(f.get("refundDays")),
          refundHolidays: String(f.get("holidays") || "")
            .split(/[\s,]+/)
            .filter(Boolean),
        });
      }}
    >
      <h2>Pay Small Small</h2>
      <p>
        Settings apply to new offers. Accepted totals and terms stay fixed.
        Procurement requires full approved payment, including the fee.
      </p>
      <fieldset disabled={!canEdit || busy}>
        <label className="va-check">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings.enabled}
          />
          Allow new Pay Small Small requests
        </label>
        <div className="va-form-grid">
          <label>
            Minimum deposit (% of landed cost)
            <input
              name="deposit"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              required
              defaultValue={settings.depositPercent}
            />
          </label>
          <label>
            Additional fee (% of landed cost)
            <input
              name="fee"
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              defaultValue={settings.feePercent}
            />
          </label>
          <label>
            Maximum payment period (days)
            <input
              name="days"
              type="number"
              min="1"
              max="365"
              step="1"
              required
              defaultValue={settings.durationDays}
            />
          </label>
          <label>
            Refund period (business days from cancellation)
            <input
              name="refundDays"
              type="number"
              min="1"
              max="60"
              step="1"
              required
              defaultValue={settings.refundBusinessDays ?? 7}
            />
          </label>
          <label>
            Nigerian public holidays (YYYY-MM-DD, one per line)
            <textarea
              name="holidays"
              defaultValue={(settings.refundHolidays ?? []).join("\n")}
            />
            <small>
              Weekends are excluded automatically. Maintain announced public
              holidays here. Existing cancellation deadlines stay fixed.
            </small>
          </label>
        </div>
        <button className="va-primary">Save payment-plan settings</button>
      </fieldset>
    </form>
  );
}
export function VehiclePlanAdmin({
  plan,
  paid,
  action,
  busy,
  canEdit,
}: {
  plan: VehiclePlan;
  paid: string;
  action: Action;
  busy: boolean;
  canEdit: boolean;
}) {
  const terms = plan.terms;
  return (
    <section className="va-panel">
      <h2>Pay Small Small</h2>
      <p>{plan.status.replaceAll("_", " ")}</p>
      {terms && (
        <>
          <p>
            Deposit {naira(terms.depositMinor / 100)} · Fee {terms.feePercent}%
            · {terms.durationDays} days · Total {naira(terms.totalMinor / 100)}
          </p>
          <p>
            {plan.acceptedAt
              ? `Customer accepted ${new Date(plan.acceptedAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })} WAT`
              : "Customer has not accepted this offer."}
          </p>
          <ul>
            {planSchedule(terms, plan.activatedAt, moneyMinor(paid)).map(
              (r) => (
                <li key={r.label}>
                  {r.label}: {naira(r.amountMinor / 100)} ·{" "}
                  {r.paid
                    ? "Paid"
                    : r.dueAt
                      ? new Date(r.dueAt).toLocaleDateString("en-GB", {
                          timeZone: "Africa/Lagos",
                        })
                      : "Awaiting deposit"}
                </li>
              ),
            )}
          </ul>
        </>
      )}
      {plan.refundDueAt && (
        <p>
          Refund due by{" "}
          {new Date(plan.refundDueAt).toLocaleDateString("en-GB", {
            timeZone: "Africa/Lagos",
          })}{" "}
          · {plan.refundBusinessDays} business days from cancellation.{" "}
          {new Date(plan.refundDueAt) < new Date() &&
          !["REFUNDED", "CANCELLED"].includes(plan.status)
            ? "OVERDUE — prioritise settlement."
            : "Reconciliation does not reset the deadline."}
        </p>
      )}
      {plan.refundFeeMinor && (
        <p>
          Approved payments: {naira(Number(plan.refundGrossMinor) / 100)} ·
          Cancellation deduction: {naira(Number(plan.refundFeeMinor) / 100)}
        </p>
      )}
      {plan.cancellationReason && (
        <p>Cancellation reason: {plan.cancellationReason}</p>
      )}
      {plan.status === "CANCELLATION_REQUESTED" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void action(`/api/vehicles/orders/${plan.orderId}/plan`, {
              action: "propose_refund",
              reason: f.get("reason"),
            });
          }}
        >
          <label>
            Reconciliation notes
            <textarea name="reason" required maxLength={2000} />
          </label>
          {moneyMinor(paid) > 0 && (
            <>
              <p>
                The refund destination is loaded from the customer’s profile and
                must have passed email verification and Paystack validation. An
                alternative account cannot be entered here.
              </p>
              <p>
                Approved payments: {naira(moneyMinor(paid) / 100)} · Deduction
                (0.5%): {naira(refundAmounts(moneyMinor(paid)).feeMinor / 100)}{" "}
                · Refund:{" "}
                {naira(refundAmounts(moneyMinor(paid)).netMinor / 100)}. A
                different finance reviewer confirms the outgoing transfer.
              </p>
            </>
          )}
          <button className="va-primary" disabled={busy || !canEdit}>
            {moneyMinor(paid) > 0
              ? "Propose refund less 0.5%"
              : "Close unpaid plan"}
          </button>
        </form>
      )}
      {plan.status === "REFUND_PENDING" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void action(`/api/vehicles/orders/${plan.orderId}/plan`, {
              action: "confirm_refund",
              amount: f.get("amount"),
              reference: f.get("reference"),
              bankTransferConfirmed: f.get("confirmed") === "on",
            });
          }}
        >
          <p>
            Refund {naira(Number(plan.refundMinor) / 100)} to{" "}
            {plan.refundAccount}.
          </p>
          <label>
            Actual amount transferred (NGN)
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </label>
          <label>
            Outgoing bank transaction reference
            <input name="reference" minLength={6} maxLength={191} required />
          </label>
          <label className="va-check">
            <input type="checkbox" name="confirmed" required />I verified the
            outgoing bank transfer and destination. I am the second reviewer.
          </label>
          <button className="va-primary" disabled={busy || !canEdit}>
            Confirm refund transferred
          </button>
        </form>
      )}
      {plan.status === "REFUNDED" && (
        <p>
          Refunded {naira(Number(plan.refundMinor) / 100)} ·{" "}
          {plan.refundReference}
        </p>
      )}
    </section>
  );
}
