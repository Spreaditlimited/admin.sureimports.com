/** Shared, side-effect-free vehicle Pay Small Small rules. Money is integer kobo. */
export type PlanSettings = {
  enabled: boolean;
  depositPercent: number;
  feePercent: number;
  durationDays: number;
  refundBusinessDays?: number;
  refundHolidays?: string[];
  revision: number;
};
export const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  enabled: false,
  depositPercent: 30,
  feePercent: 5,
  durationDays: 180,
  refundBusinessDays: 7,
  refundHolidays: [],
  revision: 1,
};
export type PlanTerms = {
  version: 1;
  revision: number;
  landedMinor: number;
  feeMinor: number;
  totalMinor: number;
  depositMinor: number;
  depositPercent: number;
  feePercent: number;
  durationDays: number;
  procurement: "FULL_PAYMENT";
  termsText: string;
};
export type VehiclePlan = {
  orderId: string;
  status: string;
  terms: PlanTerms | null;
  acceptedAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  cancellationRequestedAt?: string | null;
  refundDueAt?: string | null;
  refundBusinessDays?: number | null;
  refundGrossMinor?: string | null;
  refundFeeMinor?: string | null;
  refundBankFingerprint?: string | null;
  cancellationReason: string | null;
  refundProposedBy: string | null;
  refundMinor: string | null;
  refundAccount: string | null;
  refundReference: string | null;
};
export function validPlanSettings(s: PlanSettings) {
  const percent = (n: number) =>
    Number.isFinite(n) &&
    Number.isInteger(Math.round(n * 100)) &&
    Math.abs(n * 100 - Math.round(n * 100)) < 0.000001;
  return (
    typeof s.enabled === "boolean" &&
    percent(s.depositPercent) &&
    s.depositPercent > 0 &&
    s.depositPercent <= 100 &&
    percent(s.feePercent) &&
    s.feePercent >= 0 &&
    s.feePercent <= 100 &&
    Number.isInteger(s.durationDays) &&
    s.durationDays >= 1 &&
    s.durationDays <= 365 &&
    Number.isInteger(s.revision) &&
    s.revision > 0
  );
}
export function moneyMinor(value: string | number) {
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error("Invalid money amount.");
  const [whole, fraction = ""] = text.split(".");
  const n = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (n > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Amount exceeds supported limits.");
  return Number(n);
}
export function moneyDecimal(minor: number) {
  if (!Number.isSafeInteger(minor) || minor < 0)
    throw new Error("Invalid money amount.");
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
}
function percentOf(amount: number, percent: number, ceil = false) {
  const n = BigInt(amount) * BigInt(Math.round(percent * 100));
  return Number((n + (ceil ? BigInt(9999) : BigInt(5000))) / BigInt(10000));
}
export function planTerms(
  landed: string | number,
  settings: PlanSettings,
): PlanTerms {
  if (!validPlanSettings(settings))
    throw new Error("Invalid Pay Small Small settings.");
  const landedMinor = moneyMinor(landed);
  if (landedMinor <= 0)
    throw new Error("A confirmed landed price is required.");
  const feeMinor = percentOf(landedMinor, settings.feePercent);
  const totalMinor = landedMinor + feeMinor;
  if (!Number.isSafeInteger(totalMinor))
    throw new Error("Plan amount exceeds supported limits.");
  const depositMinor = percentOf(landedMinor, settings.depositPercent, true);
  return {
    version: 1,
    revision: settings.revision,
    landedMinor,
    feeMinor,
    totalMinor,
    depositMinor,
    depositPercent: settings.depositPercent,
    feePercent: settings.feePercent,
    durationDays: settings.durationDays,
    procurement: "FULL_PAYMENT",
    termsText: `Pay Small Small: ${settings.depositPercent}% minimum deposit on the invoiced landed cost before the additional ${settings.feePercent}% fee. Pay the full landed cost plus fee within ${settings.durationDays} days of the verified credit that satisfies the deposit. The accepted Naira total is fixed. No procurement or supplier reservation occurs before full approved payment. Delivery timing starts after full payment and procurement confirmation. Extra payments and early completion are allowed without an early-payment penalty. Bank proof is subject to verification. Cancellation before procurement starts incurs a deduction of 0.5% of approved payments, including after full payment. The balance is refunded within ${settings.refundBusinessDays ?? 7} business days from the cancellation request, excluding weekends and configured Nigerian public holidays, to your Paystack-validated profile bank account. No automatic forfeiture or late fee applies. Collection and onward delivery from Lagos are your responsibility.`,
  };
}
export function planSchedule(
  terms: PlanTerms,
  activatedAt: string | null,
  paidMinor: number,
) {
  const remainder = terms.totalMinor - terms.depositMinor,
    count = Math.ceil(terms.durationDays / 30);
  const base = Math.floor(remainder / count);
  let allocated = terms.depositMinor;
  return [
    {
      label: "Initial deposit",
      amountMinor: terms.depositMinor,
      cumulativeMinor: terms.depositMinor,
      dueAt: null as string | null,
      paid: paidMinor >= terms.depositMinor,
    },
    ...Array.from({ length: count }, (_, i) => {
      const amountMinor =
        i === count - 1 ? remainder - base * (count - 1) : base;
      allocated += amountMinor;
      const dueAt = activatedAt
        ? new Date(
            new Date(activatedAt).getTime() +
              Math.min((i + 1) * 30, terms.durationDays) * 86400000,
          ).toISOString()
        : null;
      return {
        label: `Instalment ${i + 1}`,
        amountMinor,
        cumulativeMinor: allocated,
        dueAt,
        paid: paidMinor >= allocated,
      };
    }),
  ].filter((row) => row.amountMinor > 0);
}
export function activationDate(
  terms: PlanTerms,
  credits: { amountMinor: number; creditedAt: string }[],
) {
  let cumulative = 0;
  for (const credit of [...credits].sort((a, b) =>
    a.creditedAt.localeCompare(b.creditedAt),
  )) {
    cumulative += credit.amountMinor;
    if (cumulative >= terms.depositMinor) return credit.creditedAt;
  }
  return null;
}
export function planAllowsPayment(plan: VehiclePlan | null) {
  return !plan || ["ACCEPTED", "ACTIVE"].includes(plan.status);
}
export function planAllowsFulfilment(
  plan: VehiclePlan | null,
  balance: string | number,
) {
  return moneyMinor(balance) === 0 && (!plan || plan.status === "COMPLETED");
}
