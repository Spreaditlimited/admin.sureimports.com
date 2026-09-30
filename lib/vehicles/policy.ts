export const DEFAULT_VEHICLE_MARKUP_PERCENT = 20;
export function validVehicleMarkup(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 99999999.99 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001
  );
}
export const VEHICLE_STAGES = [
  "ORDER_CONFIRMED",
  "SUPPLIER_ORDERED",
  "VEHICLE_READY",
  "INSPECTED",
  "SHIPPED",
  "ARRIVED",
  "CLEARING",
  "READY_FOR_DELIVERY",
  "DELIVERED",
] as const;
export const STAGE_LABELS: Record<string, string> = {
  PLAN_PAYMENT_REVIEW: 'Bank payment under review',
  PLAN_PAYMENT_REVERSED: 'Bank payment reversed',
  PLAN_ACCEPTED: "Payment plan accepted",
  PLAN_ACTIVATED: "Payment plan activated",
  PLAN_COMPLETED: "Payment plan fully paid",
  PLAN_REMINDER: "Payment reminder",
  PLAN_CANCELLATION: "Cancellation requested",
  PLAN_CANCELLED: "Payment plan cancelled",
  PLAN_REFUND_PENDING: "Refund pending",
  PLAN_REFUNDED: "Refund completed",
  ENQUIRY: "Quotation requested",
  QUOTED: "Awaiting payment",
  PAYMENT_SUBMITTED: "Payment submitted",
  PAYMENT_CONFIRMED: "Payment confirmed",
  PAYMENT_REJECTED: "Payment needs attention",
  ORDER_CONFIRMED: "Order confirmed",
  SUPPLIER_ORDERED: "Ordered from supplier",
  VEHICLE_READY: "Vehicle ready",
  INSPECTED: "Inspection completed",
  SHIPPED: "Dispatched from China",
  ARRIVED: "Arrived in Nigeria",
  CLEARING: "Clearing",
  READY_FOR_DELIVERY: "Ready for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  UPDATE: "Order update",
};
export type VehicleSpec = {
  id: string;
  name: string;
  manufacturerRmb: number | null;
  priceCurrency?: "RMB" | "USD";
  manufacturerUsd?: number | null;
  manufacturerUsdMax?: number | null;
  referenceOnly?: boolean;
  dimensionsSource?: string;
  dimensionsNote?: string;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  batteryKwh: number | null;
  rangeKm: number | null;
  rangeStandard: string;
  seats: number | null;
  cargoM3: number | null;
  priceConfirmed: boolean;
  specificationsConfirmed: boolean;
  source: string;
};
export type VehicleModel = {
  slug: string;
  name: string;
  category: string;
  powertrain: string;
  description: string;
  images: string[];
  youtubeUrls: string[];
  variants: VehicleSpec[];
  published: boolean;
};
export type Rates = {
  ngnPerRmb: number;
  ngnPerUsd?: number;
  ngnPerCbm: number;
  markupPercent?: number;
};
export function cbm(v: Pick<VehicleSpec, "lengthMm" | "widthMm" | "heightMm">) {
  const dimensions = [v.lengthMm, v.widthMm, v.heightMm];
  if (dimensions.some((n) => n === null || !Number.isFinite(n) || n <= 0))
    return null;
  return (Number(v.lengthMm) * Number(v.widthMm) * Number(v.heightMm)) / 1e9;
}
export function priceVehicle(v: VehicleSpec, rates: Rates, quantity = 1) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
    throw new Error("Choose between 1 and 100 vehicles.");
  const markupPercent = rates.markupPercent ?? DEFAULT_VEHICLE_MARKUP_PERCENT;
  if (!validVehicleMarkup(markupPercent)) return null;
  const volume = cbm(v);
  if (v.priceCurrency && !["RMB", "USD"].includes(v.priceCurrency)) return null;
  const usd = v.priceCurrency === "USD";
  const amount = usd ? v.manufacturerUsd : v.manufacturerRmb;
  const exchange = usd ? rates.ngnPerUsd : rates.ngnPerRmb;
  if (
    v.referenceOnly ||
    volume === null ||
    !amount ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !exchange ||
    !Number.isFinite(exchange) ||
    exchange <= 0 ||
    !Number.isFinite(rates.ngnPerCbm) ||
    rates.ngnPerCbm <= 0
  )
    return null;
  const vehicleKobo = Math.round(amount * (100 + markupPercent) * exchange);
  const shippingKobo = Math.round(volume * rates.ngnPerCbm * 100);
  if (!Number.isSafeInteger((vehicleKobo + shippingKobo) * quantity))
    throw new Error("Price exceeds the supported amount.");
  return {
    cbm: volume,
    vehicleNgn: (vehicleKobo * quantity) / 100,
    shippingNgn: (shippingKobo * quantity) / 100,
    totalNgn: ((vehicleKobo + shippingKobo) * quantity) / 100,
    quantity,
  };
}
// Model-level supplier ranges are budget estimates, never invoiceable trim prices.
export function referenceVehiclePrice(v: VehicleSpec, rates: Rates) {
  if (!v.referenceOnly || v.priceCurrency !== "USD") return null;
  const min = v.manufacturerUsd;
  const max = v.manufacturerUsdMax;
  const rate = rates.ngnPerUsd;
  const markup = rates.markupPercent ?? DEFAULT_VEHICLE_MARKUP_PERCENT;
  if (
    !min ||
    !max ||
    !rate ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    !Number.isFinite(rate) ||
    min <= 0 ||
    max < min ||
    rate <= 0 ||
    !validVehicleMarkup(markup)
  )
    return null;
  const low = Math.round(min * (100 + markup) * rate);
  const high = Math.round(max * (100 + markup) * rate);
  if (!Number.isSafeInteger(low) || !Number.isSafeInteger(high)) return null;
  const volume = cbm(v);
  const shippingKobo =
    volume !== null && Number.isFinite(rates.ngnPerCbm) && rates.ngnPerCbm > 0
      ? Math.round(volume * rates.ngnPerCbm * 100)
      : null;
  if (shippingKobo !== null && !Number.isSafeInteger(high + shippingKobo))
    return null;
  return {
    minNgn: low / 100,
    maxNgn: high / 100,
    shippingNgn: shippingKobo === null ? null : shippingKobo / 100,
    landedMinNgn: shippingKobo === null ? null : (low + shippingKobo) / 100,
    landedMaxNgn: shippingKobo === null ? null : (high + shippingKobo) / 100,
  };
}
export function canQuote(v: VehicleSpec, rates: Rates) {
  return (
    v.priceConfirmed &&
    v.specificationsConfirmed &&
    priceVehicle(v, rates) !== null
  );
}
export function canAdvance(current: string, next: string) {
  const index = VEHICLE_STAGES.indexOf(
    current as (typeof VEHICLE_STAGES)[number],
  );
  return index >= 0 && VEHICLE_STAGES[index + 1] === next;
}
export function youtubeId(value: string) {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();
    const id =
      host === "youtu.be"
        ? u.pathname.slice(1)
        : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
          ? u.searchParams.get("v") ||
            u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]
          : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export const naira = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
