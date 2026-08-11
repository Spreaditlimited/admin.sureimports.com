import type {
  CalculatedQuote,
  CalculatedQuoteLine,
  QuoteBuildInput,
  QuoteCurrency,
  QuoteProduct,
  QuotationRateSnapshot,
} from './types';

function finite(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNgn(value: number, currency: QuoteCurrency, rates: QuotationRateSnapshot) {
  if (currency === 'NGN') return value;
  if (currency === 'USD') return value * rates.ngnPerUsd;
  return value * rates.ngnPerCny;
}

function productWeight(product: QuoteProduct) {
  const explicit = finite(product.totalWeightKg);
  if (explicit > 0) return explicit;
  return Math.max(0, finite(product.unitWeightKg) * finite(product.quantity));
}

function productCbm(product: QuoteProduct) {
  const explicit = finite(product.totalCbm);
  if (explicit > 0) return explicit;
  const unitsPerCarton = finite(product.unitsPerCarton);
  const l = finite(product.cartonLengthCm);
  const w = finite(product.cartonWidthCm);
  const h = finite(product.cartonHeightCm);
  if (unitsPerCarton <= 0 || l <= 0 || w <= 0 || h <= 0) return 0;
  const cartons = Math.ceil(finite(product.quantity) / unitsPerCarton);
  return (l * w * h * cartons) / 1_000_000;
}

export function calculateQuote(input: QuoteBuildInput): CalculatedQuote {
  if (!input.products.length) throw new Error('Add at least one product before building the quotation.');

  const lines: CalculatedQuoteLine[] = input.products.map((product) => {
    const quantity = finite(product.quantity);
    const convertedUnitPriceNgn = money(toNgn(finite(product.unitPrice), product.currency, input.rates));
    const productCostNgn = money(convertedUnitPriceNgn * quantity);
    const domesticTransportNgn = money(
      toNgn(finite(product.domesticTransportCost), product.domesticTransportCurrency, input.rates),
    );
    const serviceChargeNgn = money(productCostNgn * (finite(input.rates.serviceChargePercent) / 100));
    const vatNgn = money(serviceChargeNgn * (finite(input.rates.vatPercent) / 100));
    return {
      ...product,
      convertedUnitPriceNgn,
      productCostNgn,
      domesticTransportNgn,
      serviceChargeNgn,
      vatNgn,
      subtotalBeforeShippingNgn: money(productCostNgn + domesticTransportNgn + serviceChargeNgn + vatNgn),
      calculatedWeightKg: productWeight(product),
      calculatedCbm: productCbm(product),
    };
  });

  const sum = (key: keyof CalculatedQuoteLine) =>
    lines.reduce((total, line) => total + finite(line[key]), 0);
  const productCostNgn = money(sum('productCostNgn'));
  const domesticTransportNgn = money(sum('domesticTransportNgn'));
  const serviceChargeNgn = money(sum('serviceChargeNgn'));
  const vatNgn = money(sum('vatNgn'));
  const subtotalBeforeShippingNgn = money(
    productCostNgn + domesticTransportNgn + serviceChargeNgn + vatNgn,
  );
  const totalWeightKg = sum('calculatedWeightKg');
  const totalCbm = sum('calculatedCbm');
  const airShippingNgn = money(totalWeightKg * input.rates.airRateUsdPerKg * input.rates.ngnPerUsd);
  const seaShippingNgn = money(totalCbm * input.rates.seaRateNgnPerCbm);

  return {
    lines,
    productCostNgn,
    domesticTransportNgn,
    serviceChargeNgn,
    vatNgn,
    subtotalBeforeShippingNgn,
    totalWeightKg,
    totalCbm,
    airShippingNgn,
    seaShippingNgn,
    landedByAirNgn: money(subtotalBeforeShippingNgn + airShippingNgn),
    landedBySeaNgn: money(subtotalBeforeShippingNgn + seaShippingNgn),
  };
}
