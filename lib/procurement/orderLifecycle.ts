import { prisma } from '@/lib/prisma';

const EDITABLE_ESTIMATE_STATUSES = new Set(['saved', 'on-hold']);

function finite(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function shippingCostInUsd(
  measurement: number,
  rate: number,
  rateCurrency: 'USD' | 'NGN',
  ngnPerUsd: number,
) {
  const cost = measurement * rate;
  if (rateCurrency === 'NGN') {
    if (ngnPerUsd <= 0) throw new Error('Naira exchange rate is invalid.');
    return cost / ngnPerUsd;
  }
  return cost;
}

export async function getProcurementOrderLifecycle(pidOrder: string) {
  const order = await prisma.orders.findUnique({ where: { pidOrder } });
  if (!order) throw new Error('Order not found.');

  const [products, country, plan, financial] = await Promise.all([
    prisma.products.findMany({
      where: { pidOrder },
      orderBy: { id: 'asc' },
    }),
    order.destinationCountry
      ? prisma.country.findUnique({
          where: { pidCountry: order.destinationCountry },
          select: { countryName: true },
        })
      : null,
    order.shippingPlan
      ? prisma.shippingplan.findUnique({
          where: { pidShippingPlan: order.shippingPlan },
          select: {
            shippingPlanName: true,
            shippingPlanRate: true,
            shippingPlanUnit: true,
          },
        })
      : null,
    prisma.exchange_rate.findUnique({ where: { id: 1 } }),
  ]);
  if (!financial) throw new Error('Financial configuration was not found.');

  const usesMeasurementPricing = order.shippingPricingVersion === 2;
  const useLatestEstimate = EDITABLE_ESTIMATE_STATUSES.has(order.status || '');
  const ngnPerUsd = useLatestEstimate
    ? finite(financial.exNairaToDollar)
    : finite(order.exchangeRate1, finite(financial.exNairaToDollar));
  const cnyPerUsd = useLatestEstimate
    ? finite(financial.exYuanToDollar)
    : finite(order.exchangeRate2, finite(financial.exYuanToDollar));
  if (ngnPerUsd <= 0 || cnyPerUsd <= 0) {
    throw new Error('Exchange-rate configuration is invalid.');
  }

  const productsTotalRaw = products.reduce(
    (total, product) =>
      total + finite(product.productQuantity) * finite(product.productPrice),
    0,
  );
  const productsTotalUsd =
    order.currencyType === 'CNY'
      ? productsTotalRaw / cnyPerUsd
      : order.currencyType === 'NGN'
        ? productsTotalRaw / ngnPerUsd
        : productsTotalRaw;
  const totalMeasurement = products.reduce(
    (total, product) =>
      total +
      finite(product.productQuantity) *
        finite(
          usesMeasurementPricing
            ? product.shippingMeasurePerUnit
            : product.productWeight,
        ),
    0,
  );

  const shippingRate = usesMeasurementPricing
    ? finite(order.shippingRateSnapshot)
    : finite(plan?.shippingPlanRate, 10);
  const shippingUnit: 'KG' | 'CBM' = usesMeasurementPricing
    ? order.shippingMeasurementUnit === 'CBM'
      ? 'CBM'
      : 'KG'
    : plan?.shippingPlanUnit === 'CBM'
      ? 'CBM'
      : 'KG';
  const shippingRateCurrency: 'USD' | 'NGN' = usesMeasurementPricing
    ? order.shippingRateCurrency === 'NGN'
      ? 'NGN'
      : 'USD'
    : 'USD';

  const domesticShippingCostUsd = 5;
  const dynamicInternationalShippingCostUsd = shippingCostInUsd(
    totalMeasurement,
    shippingRate,
    shippingRateCurrency,
    ngnPerUsd,
  );
  const dynamicEstimatedShippingCostUsd =
    domesticShippingCostUsd + dynamicInternationalShippingCostUsd;
  const serviceChargePercent = useLatestEstimate
    ? finite(financial.service_charge, 15)
    : finite(order.serviceCharge, finite(financial.service_charge, 15));
  const vatPercent = useLatestEstimate
    ? finite(financial.vat, 7)
    : finite(order.vat, finite(financial.vat, 7));
  const serviceChargeValueUsd =
    productsTotalUsd * (serviceChargePercent / 100);
  const vatValueUsd = serviceChargeValueUsd * (vatPercent / 100);
  const dynamicGrandTotalUsd =
    productsTotalUsd +
    dynamicEstimatedShippingCostUsd +
    serviceChargeValueUsd +
    vatValueUsd;

  const estimatedShippingCostUsd = useLatestEstimate
    ? dynamicEstimatedShippingCostUsd
    : finite(order.orderShippingCost, dynamicEstimatedShippingCostUsd);
  const grandTotalUsd = useLatestEstimate
    ? dynamicGrandTotalUsd
    : finite(order.orderTotalCost, dynamicGrandTotalUsd);
  const actualMeasurement = finite(order.orderWeight);
  const actualDomesticShippingCostUsd = finite(order.shippingCost1) / cnyPerUsd;
  const actualInternationalShippingCostUsd = shippingCostInUsd(
    actualMeasurement,
    shippingRate,
    shippingRateCurrency,
    ngnPerUsd,
  );
  const actualTotalShippingCostUsd =
    actualDomesticShippingCostUsd + actualInternationalShippingCostUsd;

  return {
    order,
    products,
    destinationCountry: country?.countryName || '',
    shippingPlanName: plan?.shippingPlanName || '',
    usesMeasurementPricing,
    shippingRate,
    shippingUnit,
    shippingRateCurrency,
    productsTotalUsd,
    productsCount: products.length,
    totalMeasurement,
    domesticShippingCostUsd,
    internationalShippingCostUsd: useLatestEstimate
      ? dynamicInternationalShippingCostUsd
      : Math.max(estimatedShippingCostUsd - domesticShippingCostUsd, 0),
    estimatedShippingCostUsd,
    serviceChargePercent,
    serviceChargeValueUsd,
    vatPercent,
    vatValueUsd,
    grandTotalUsd,
    actualMeasurement,
    actualDomesticShippingCostUsd,
    actualInternationalShippingCostUsd,
    actualTotalShippingCostUsd,
    costDifferenceUsd:
      actualTotalShippingCostUsd - estimatedShippingCostUsd,
    rates: { ngnPerUsd, cnyPerUsd, ngnPerCny: finite(order.exchangeRate3, finite(financial.exNairaToYuan)) },
  };
}
