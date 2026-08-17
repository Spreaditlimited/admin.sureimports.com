import { NextRequest, NextResponse } from 'next/server';
import { formatShippingPlanDisplay } from '@/lib/formatShippingPlan';
import { getProcurementOrderLifecycle } from '@/lib/procurement/orderLifecycle';

export async function GET(request: NextRequest) {
  const pidOrder = request.nextUrl.searchParams.get('pidOrder');
  if (!pidOrder) {
    return NextResponse.json(
      { error: 'pidOrder is required' },
      { status: 400 },
    );
  }

  try {
    const lifecycle = await getProcurementOrderLifecycle(pidOrder);
    const currencyType = lifecycle.order.currencyType || '';

    return NextResponse.json({
      productsGetAll: lifecycle.products,
      productsTotalPrice: lifecycle.productsTotalUsd,
      productsTotalCount: lifecycle.productsCount,
      productsTotalWeight: lifecycle.totalMeasurement,
      actualWeight: lifecycle.actualMeasurement,
      actualDomesticShippingCost: lifecycle.actualDomesticShippingCostUsd,
      actualInternationalShippingCost:
        lifecycle.actualInternationalShippingCostUsd,
      actualTotalShippingCost: lifecycle.actualTotalShippingCostUsd,
      costDifference: lifecycle.costDifferenceUsd,
      currencyType,
      currencyName:
        currencyType === 'CNY'
          ? 'Yuan'
          : currencyType === 'NGN'
            ? 'Naira'
            : 'USD',
      currencyLogo:
        currencyType === 'CNY' ? '¥' : currencyType === 'NGN' ? '₦' : '$',
      exNairaToDollar: lifecycle.rates.ngnPerUsd,
      exYuanToDollar: lifecycle.rates.cnyPerUsd,
      exNairaToYuan: lifecycle.rates.ngnPerCny,
      serviceCharge: lifecycle.serviceChargePercent,
      serviceChargeValue: lifecycle.serviceChargeValueUsd,
      vat: lifecycle.vatPercent,
      vatValue: lifecycle.vatValueUsd,
      destinationCountry: lifecycle.destinationCountry,
      shippingPlanName: formatShippingPlanDisplay(lifecycle.shippingPlanName),
      shippingPlanRate: lifecycle.shippingRate,
      shippingPlanUnit: lifecycle.shippingUnit,
      shippingRateCurrency: lifecycle.shippingRateCurrency,
      usesMeasurementPricing: lifecycle.usesMeasurementPricing,
      domesticShippingCost: lifecycle.domesticShippingCostUsd,
      internationalShippingCost: lifecycle.internationalShippingCostUsd,
      estimatedTotalShippingCost: lifecycle.estimatedShippingCostUsd,
      grandTotalCost: lifecycle.grandTotalUsd,
    });
  } catch (error) {
    console.error('Error calculating procurement order lifecycle:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
