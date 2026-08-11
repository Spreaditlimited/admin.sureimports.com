import { prisma } from '@/lib/prisma';

import type { QuotationRateSnapshot } from './types';

function positive(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} is missing or invalid in admin configuration.`);
  }
  return parsed;
}

function nonNegative(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} is missing or invalid in admin configuration.`);
  }
  return parsed;
}

export async function getQuotationRateDefaults(): Promise<QuotationRateSnapshot> {
  const [financial, nigeria] = await Promise.all([
    prisma.exchange_rate.findUnique({
      where: { id: 1 },
      select: {
        exNairaToDollar: true,
        exYuanToDollar: true,
        exNairaToYuan: true,
        service_charge: true,
        vat: true,
        quotationSeaRateNgnPerCbm: true,
      },
    }),
    prisma.country.findFirst({
      where: { countryName: 'Nigeria' },
      select: {
        countryName: true,
        shippingPlans: {
          where: { shippingPlanName: 'NORMAL_SHIPPING' },
          select: {
            pidShippingPlan: true,
            shippingPlanName: true,
            shippingPlanRate: true,
            shippingPlanUnit: true,
          },
          take: 1,
        },
      },
    }),
  ]);

  if (!financial) throw new Error('Global exchange-rate configuration was not found.');
  const airPlan = nigeria?.shippingPlans?.[0];
  if (!airPlan || String(airPlan.shippingPlanUnit || '').toUpperCase() !== 'KG') {
    throw new Error('Nigeria normal air-shipping plan per KG was not found.');
  }

  return {
    ngnPerUsd: positive(financial.exNairaToDollar, 'NGN/USD rate'),
    cnyPerUsd: positive(financial.exYuanToDollar, 'CNY/USD rate'),
    ngnPerCny: positive(financial.exNairaToYuan, 'NGN/CNY rate'),
    serviceChargePercent: nonNegative(financial.service_charge, 'Service charge'),
    vatPercent: nonNegative(financial.vat, 'VAT rate'),
    airRateUsdPerKg: positive(airPlan.shippingPlanRate, 'Air-shipping rate'),
    seaRateNgnPerCbm: positive(financial.quotationSeaRateNgnPerCbm, 'Quotation sea rate'),
    airPlanId: airPlan.pidShippingPlan,
    airPlanName: airPlan.shippingPlanName || 'NORMAL_SHIPPING',
    destinationCountry: nigeria?.countryName || 'Nigeria',
    deliveryPoint: 'Sure Imports Lagos warehouse',
  };
}
