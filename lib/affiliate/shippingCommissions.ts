import 'server-only';

import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { shippingBillingUnit } from '@/lib/shipping/measurement';

export const SHIP_WITH_US_SERVICE_KEY = 'SHIP_WITH_US';

function normalized(value: unknown) { return String(value || '').trim().toUpperCase(); }

export async function shippingCommissionQuote(tx: Prisma.TransactionClient, input: {
  pidShippingOnly: string;
  currency: string;
  eligibleQuantity: unknown;
}) {
  const request = await tx.shipping_only.findUnique({
    where: { pidShippingOnly: input.pidShippingOnly },
    include: { affiliateAttribution: true },
  });
  if (!request) throw new Error('The linked shipping request was not found.');
  if (!request.affiliateAttribution) return null;

  const service = await tx.affiliate_program_services.findFirst({
    where: { serviceKey: SHIP_WITH_US_SERVICE_KEY, active: true },
    include: { unitRates: { where: { active: true } } },
  });
  if (!service || service.commissionType !== 'PER_UNIT') throw new Error('Ship with Us affiliate commissions are not currently configured.');

  const plan = request.shippingPlan ? await tx.shippingplan.findUnique({
    where: { pidShippingPlan: request.shippingPlan },
    include: { country: { select: { countryName: true } } },
  }) : null;
  if (!plan) throw new Error('The linked shipping request does not have a valid shipping plan.');

  const destinationCountry = normalized(plan.country.countryName || request.shippingTo);
  const billingUnit = shippingBillingUnit(plan.country.countryName || request.shippingTo, plan.shippingPlanName, plan.shippingPlanUnit);
  const shippingMode = normalized(plan.shippingPlanName).includes('SEA') ? 'SEA' : 'AIR';
  const currency = normalized(input.currency);
  if (!['NGN', 'USD'].includes(currency)) throw new Error('Ship with Us commissions support NGN and USD invoices only.');
  const quantity = new Prisma.Decimal(String(input.eligibleQuantity || '')).toDecimalPlaces(4);
  if (!quantity.isFinite() || quantity.lte(0)) throw new Error(`Enter the final billable quantity in ${billingUnit}.`);

  const candidates = service.unitRates.filter((rate) =>
    rate.currency === currency && normalized(rate.billingUnit) === billingUnit &&
    (normalized(rate.destinationCountry) === '*' || normalized(rate.destinationCountry) === destinationCountry) &&
    (normalized(rate.shippingMode) === '*' || normalized(rate.shippingMode) === shippingMode),
  ).sort((a, b) => {
    const score = (rate: typeof a) => (normalized(rate.destinationCountry) === destinationCountry ? 2 : 0) + (normalized(rate.shippingMode) === shippingMode ? 1 : 0);
    return score(b) - score(a);
  });
  const rate = candidates[0];
  if (!rate) throw new Error(`No active ${currency} commission rate is configured for ${destinationCountry} ${shippingMode} shipments billed per ${billingUnit}.`);

  return {
    request,
    attribution: request.affiliateAttribution,
    service,
    billingUnit,
    destinationCountry,
    shippingMode,
    currency,
    quantity,
    unitRate: rate.unitRate,
    commissionAmount: quantity.mul(rate.unitRate).toDecimalPlaces(2),
  };
}

export async function createShippingCommissionSnapshot(tx: Prisma.TransactionClient, input: {
  pidInvoice: string;
  pidShippingOnly: string;
  currency: string;
  eligibleQuantity: unknown;
}) {
  const quote = await shippingCommissionQuote(tx, input);
  if (!quote) return null;
  return tx.invoice_affiliate_commission_snapshots.create({ data: {
    pidSnapshot: `iac_${randomBytes(18).toString('base64url')}`,
    pidInvoice: input.pidInvoice,
    shippingAttributionId: quote.attribution.id,
    affiliateId: quote.attribution.affiliateId,
    referralId: quote.attribution.referralId,
    serviceId: quote.service.id,
    billingUnit: quote.billingUnit,
    eligibleQuantity: quote.quantity,
    commissionCurrency: quote.currency,
    unitRate: quote.unitRate,
    commissionAmount: quote.commissionAmount,
    sourceType: quote.attribution.sourceType,
  } });
}

export async function recordPaidShippingCommission(tx: Prisma.TransactionClient, input: {
  pidInvoice: string;
  grossAmount: Prisma.Decimal;
}) {
  const snapshot = await tx.invoice_affiliate_commission_snapshots.findUnique({
    where: { pidInvoice: input.pidInvoice },
    include: { service: true, conversion: true },
  });
  if (!snapshot || snapshot.conversionId || snapshot.status === 'VOIDED') return null;
  const pidConversion = `aconv_${randomBytes(18).toString('base64url')}`;
  const releaseMode = snapshot.service.approvalMode === 'AUTOMATIC' ? 'AUTOMATIC' : 'MANUAL';
  const releaseAt = releaseMode === 'AUTOMATIC' ? new Date(Date.now() + snapshot.service.reviewPeriodDays * 86_400_000) : null;
  const conversion = await tx.affiliate_conversions.create({ data: {
    pidConversion,
    affiliateId: snapshot.affiliateId,
    serviceId: snapshot.serviceId,
    referralId: snapshot.referralId,
    externalOrderReference: `shipping-invoice:${input.pidInvoice}`,
    externalPaymentReference: `shipping-invoice:${input.pidInvoice}:paid`,
    paymentCurrency: snapshot.commissionCurrency,
    grossAmount: input.grossAmount,
    eligibleAmount: input.grossAmount,
    commissionCurrency: snapshot.commissionCurrency,
    commissionAmount: snapshot.commissionAmount,
    commissionBasisUnit: snapshot.billingUnit,
    commissionBasisQuantity: snapshot.eligibleQuantity,
    commissionRate: snapshot.unitRate,
    status: 'PENDING', releaseMode, releaseAt,
  } });
  await tx.invoice_affiliate_commission_snapshots.update({ where: { id: snapshot.id }, data: { status: 'RECORDED', conversionId: conversion.id } });
  if (snapshot.referralId) await tx.affiliate_referrals.updateMany({ where: { id: snapshot.referralId, convertedAt: null }, data: { convertedAt: new Date() } });
  return { conversion, snapshot, serviceName: snapshot.service.displayName };
}
