import 'server-only';

import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const CURRENCIES = ['NGN', 'USD'] as const;
type Currency = (typeof CURRENCIES)[number];
type CommissionType = 'FIXED' | 'PERCENTAGE' | 'PER_UNIT';
type ApprovalMode = 'MANUAL' | 'AUTOMATIC';
type NormalizedRate = { currency: Currency; fixedAmount: Prisma.Decimal | null; active: boolean };

type RateInput = {
  currency?: unknown;
  fixedAmount?: unknown;
  active?: unknown;
};
type UnitRateInput = { currency?: unknown; billingUnit?: unknown; destinationCountry?: unknown; shippingMode?: unknown; unitRate?: unknown; active?: unknown };
type EventRuleInput = { eventKey?: unknown; displayName?: unknown; description?: unknown; percentageRate?: unknown; eligibleAmountBasis?: unknown; active?: unknown; sortOrder?: unknown };

export type AffiliateProgramServiceInput = {
  serviceKey?: unknown;
  displayName?: unknown;
  description?: unknown;
  commissionType?: unknown;
  percentageRate?: unknown;
  eligibleAmountBasis?: unknown;
  recurring?: unknown;
  approvalMode?: unknown;
  reviewPeriodDays?: unknown;
  exclusionNotes?: unknown;
  active?: unknown;
  sortOrder?: unknown;
  rates?: unknown;
  unitRates?: unknown;
  eventRules?: unknown;
};

function clean(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

function boolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function decimal(value: unknown, label: string, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error(`${label} must be greater than zero and no more than ${maximum.toLocaleString()}.`);
  }
  return new Prisma.Decimal(parsed).toDecimalPlaces(4);
}

function normalizeInput(input: AffiliateProgramServiceInput, creating: boolean) {
  const serviceKey = clean(input.serviceKey, 80).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const displayName = clean(input.displayName, 140);
  const description = clean(input.description, 4000) || null;
  const commissionType = clean(input.commissionType, 24).toUpperCase() as CommissionType;
  const eligibleAmountBasis = clean(input.eligibleAmountBasis, 40).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const exclusionNotes = clean(input.exclusionNotes, 4000) || null;
  const sortOrder = Math.max(0, Math.min(10000, Math.trunc(Number(input.sortOrder) || 0)));
  const active = boolean(input.active, true);
  const recurring = boolean(input.recurring);
  const approvalMode = clean(input.approvalMode, 24).toUpperCase() as ApprovalMode;
  const reviewPeriodDays = Math.trunc(Number(input.reviewPeriodDays));

  if (creating && !/^[A-Z][A-Z0-9_]{2,79}$/.test(serviceKey)) {
    throw new Error('Service key must contain at least three letters, numbers, or underscores.');
  }
  if (displayName.length < 2) throw new Error('Display name is required.');
  if (!['FIXED', 'PERCENTAGE', 'PER_UNIT'].includes(commissionType)) throw new Error('Select a valid commission type.');
  if (!eligibleAmountBasis) throw new Error('Eligible amount basis is required.');
  if (!['MANUAL', 'AUTOMATIC'].includes(approvalMode)) throw new Error('Select a valid commission release mode.');
  if (!Number.isFinite(reviewPeriodDays) || reviewPeriodDays < 0 || reviewPeriodDays > 365) {
    throw new Error('Review period must be between 0 and 365 days.');
  }

  const percentageRate = commissionType === 'PERCENTAGE'
    ? decimal(input.percentageRate, 'Percentage rate', 100)
    : null;
  const rawRates = Array.isArray(input.rates) ? input.rates as RateInput[] : [];
  const rates: NormalizedRate[] = [];
  for (const currency of CURRENCIES) {
    const raw = rawRates.find((rate) => clean(rate.currency, 3).toUpperCase() === currency);
    if (!raw) continue;
    const rateActive = boolean(raw.active);
    rates.push({
      currency,
      fixedAmount: rateActive ? decimal(raw.fixedAmount, `${currency} fixed commission`, 1_000_000_000) : null,
      active: rateActive,
    });
  }
  if (commissionType === 'FIXED' && active && !rates.some((rate) => rate.active)) {
    throw new Error('An active fixed commission service needs at least one active currency rate.');
  }
  const unitRates = (Array.isArray(input.unitRates) ? input.unitRates as UnitRateInput[] : []).map((rate, index) => {
    const currency = clean(rate.currency, 3).toUpperCase() as Currency;
    const billingUnit = clean(rate.billingUnit, 16).toUpperCase();
    const destinationCountry = clean(rate.destinationCountry, 100).toUpperCase() || '*';
    const shippingMode = clean(rate.shippingMode, 24).toUpperCase() || '*';
    if (!CURRENCIES.includes(currency)) throw new Error(`Unit rate ${index + 1} has an invalid currency.`);
    if (!['KG', 'CBM'].includes(billingUnit)) throw new Error(`Unit rate ${index + 1} must use KG or CBM.`);
    if (!['*', 'AIR', 'SEA'].includes(shippingMode)) throw new Error(`Unit rate ${index + 1} has an invalid shipping mode.`);
    return { currency, billingUnit, destinationCountry, shippingMode, unitRate: decimal(rate.unitRate, `Unit rate ${index + 1}`, 1_000_000_000), active: boolean(rate.active, true) };
  });
  const scopes = new Set(unitRates.map((rate) => `${rate.currency}:${rate.billingUnit}:${rate.destinationCountry}:${rate.shippingMode}`));
  if (scopes.size !== unitRates.length) throw new Error('Unit commission scopes must be unique.');
  if (commissionType === 'PER_UNIT' && active && !unitRates.some((rate) => rate.active)) throw new Error('An active per-unit service needs at least one active unit rate.');

  const eventRules = (Array.isArray(input.eventRules) ? input.eventRules as EventRuleInput[] : []).map((rule, index) => {
    const eventKey = clean(rule.eventKey, 80).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const eventDisplayName = clean(rule.displayName, 140);
    const eligibleAmountBasis = clean(rule.eligibleAmountBasis, 40).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!/^[A-Z][A-Z0-9_]{2,79}$/.test(eventKey)) throw new Error(`Earning event ${index + 1} needs a valid key.`);
    if (!eventDisplayName) throw new Error(`Earning event ${index + 1} needs a display name.`);
    if (!eligibleAmountBasis) throw new Error(`Earning event ${index + 1} needs an eligible amount basis.`);
    return {
      eventKey,
      displayName: eventDisplayName,
      description: clean(rule.description, 4000) || null,
      commissionType: 'PERCENTAGE' as const,
      percentageRate: decimal(rule.percentageRate, `Earning event ${index + 1} percentage`, 100),
      eligibleAmountBasis,
      active: boolean(rule.active, true),
      sortOrder: Math.max(0, Math.min(10000, Math.trunc(Number(rule.sortOrder) || index * 10))),
    };
  });
  if (new Set(eventRules.map((rule) => rule.eventKey)).size !== eventRules.length) throw new Error('Earning event keys must be unique.');

  return {
    serviceKey,
    displayName,
    description,
    commissionType,
    percentageRate,
    eligibleAmountBasis,
    recurring,
    approvalMode,
    reviewPeriodDays,
    exclusionNotes,
    active,
    sortOrder,
    rates, unitRates, eventRules,
  };
}

function serializeService(service: Awaited<ReturnType<typeof serviceRecord>>) {
  return {
    pidService: service.pidService,
    serviceKey: service.serviceKey,
    displayName: service.displayName,
    description: service.description,
    commissionType: service.commissionType,
    percentageRate: service.percentageRate ? Number(service.percentageRate) : null,
    eligibleAmountBasis: service.eligibleAmountBasis,
    recurring: service.recurring,
    approvalMode: service.approvalMode,
    reviewPeriodDays: service.reviewPeriodDays,
    exclusionNotes: service.exclusionNotes,
    active: service.active,
    sortOrder: service.sortOrder,
    conversionCount: service._count.conversions,
    updatedAt: service.updatedAt.toISOString(),
    rates: service.currencyRates.map((rate) => ({
      currency: rate.currency,
      fixedAmount: rate.fixedAmount ? Number(rate.fixedAmount) : null,
      active: rate.active,
    })),
    unitRates: service.unitRates.map((rate) => ({ currency: rate.currency, billingUnit: rate.billingUnit, destinationCountry: rate.destinationCountry, shippingMode: rate.shippingMode, unitRate: Number(rate.unitRate), active: rate.active })),
    eventRules: service.eventRules.map((rule) => ({ pidEventRule: rule.pidEventRule, eventKey: rule.eventKey, displayName: rule.displayName, description: rule.description, commissionType: rule.commissionType, percentageRate: rule.percentageRate ? Number(rule.percentageRate) : null, eligibleAmountBasis: rule.eligibleAmountBasis, active: rule.active, sortOrder: rule.sortOrder })),
  };
}

function serviceRecord(pidService: string) {
  return prisma.affiliate_program_services.findUniqueOrThrow({
    where: { pidService },
    include: {
      currencyRates: { orderBy: { currency: 'asc' } },
      unitRates: { orderBy: [{ currency: 'asc' }, { billingUnit: 'asc' }, { destinationCountry: 'asc' }] },
      eventRules: { orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }] },
      _count: { select: { conversions: true } },
    },
  });
}

export async function listAffiliateProgramServices() {
  const services = await prisma.affiliate_program_services.findMany({
    orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
    include: {
      currencyRates: { orderBy: { currency: 'asc' } },
      unitRates: { orderBy: [{ currency: 'asc' }, { billingUnit: 'asc' }, { destinationCountry: 'asc' }] },
      eventRules: { orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }] },
      _count: { select: { conversions: true } },
    },
  });
  return services.map(serializeService);
}

async function syncRates(tx: Prisma.TransactionClient, serviceId: number, commissionType: CommissionType, rates: ReturnType<typeof normalizeInput>['rates']) {
  if (commissionType !== 'FIXED') {
    await tx.affiliate_service_commission_rates.updateMany({ where: { serviceId }, data: { active: false } });
    return;
  }
  const suppliedCurrencies = rates.map((rate) => rate.currency);
  await tx.affiliate_service_commission_rates.updateMany({
    where: { serviceId, currency: { notIn: suppliedCurrencies } },
    data: { active: false },
  });
  for (const rate of rates) {
    await tx.affiliate_service_commission_rates.upsert({
      where: { serviceId_currency: { serviceId, currency: rate.currency } },
      create: { serviceId, currency: rate.currency, fixedAmount: rate.fixedAmount, percentageRate: null, active: rate.active },
      update: { fixedAmount: rate.fixedAmount, percentageRate: null, active: rate.active },
    });
  }
}

async function syncUnitRates(tx: Prisma.TransactionClient, serviceId: number, commissionType: CommissionType, rates: ReturnType<typeof normalizeInput>['unitRates']) {
  await tx.affiliate_service_unit_rates.deleteMany({ where: { serviceId } });
  if (commissionType !== 'PER_UNIT' || !rates.length) return;
  await tx.affiliate_service_unit_rates.createMany({ data: rates.map((rate) => ({ serviceId, ...rate })) });
}

async function syncEventRules(tx: Prisma.TransactionClient, serviceId: number, rules: ReturnType<typeof normalizeInput>['eventRules']) {
  const supplied = rules.map((rule) => rule.eventKey);
  await tx.affiliate_service_event_rules.deleteMany({ where: { serviceId, eventKey: { notIn: supplied } } });
  for (const rule of rules) {
    await tx.affiliate_service_event_rules.upsert({
      where: { serviceId_eventKey: { serviceId, eventKey: rule.eventKey } },
      create: { pidEventRule: `afevt_${randomBytes(18).toString('base64url')}`, serviceId, ...rule },
      update: rule,
    });
  }
}

export async function createAffiliateProgramService(input: AffiliateProgramServiceInput, actor: string) {
  const normalized = normalizeInput(input, true);
  const pidService = `afsvc_${randomBytes(18).toString('base64url')}`;
  try {
    await prisma.$transaction(async (tx) => {
      const service = await tx.affiliate_program_services.create({
        data: {
          pidService,
          serviceKey: normalized.serviceKey,
          displayName: normalized.displayName,
          description: normalized.description,
          commissionType: normalized.commissionType,
          percentageRate: normalized.percentageRate,
          eligibleAmountBasis: normalized.eligibleAmountBasis,
          recurring: normalized.recurring,
          approvalMode: normalized.approvalMode,
          reviewPeriodDays: normalized.reviewPeriodDays,
          exclusionNotes: normalized.exclusionNotes,
          active: normalized.active,
          sortOrder: normalized.sortOrder,
        },
      });
      await syncRates(tx, service.id, normalized.commissionType, normalized.rates);
      await syncUnitRates(tx, service.id, normalized.commissionType, normalized.unitRates);
      await syncEventRules(tx, service.id, normalized.eventRules);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('That service key already exists.');
    }
    throw error;
  }
  console.info('[affiliate-program] service created', { pidService, actor });
  return serializeService(await serviceRecord(pidService));
}

export async function updateAffiliateProgramService(pidService: string, input: AffiliateProgramServiceInput, actor: string) {
  const normalized = normalizeInput(input, false);
  const existing = await prisma.affiliate_program_services.findUnique({ where: { pidService }, select: { id: true } });
  if (!existing) throw new Error('Affiliate service was not found.');
  await prisma.$transaction(async (tx) => {
    await tx.affiliate_program_services.update({
      where: { pidService },
      data: {
        displayName: normalized.displayName,
        description: normalized.description,
        commissionType: normalized.commissionType,
        percentageRate: normalized.percentageRate,
        eligibleAmountBasis: normalized.eligibleAmountBasis,
        recurring: normalized.recurring,
        approvalMode: normalized.approvalMode,
        reviewPeriodDays: normalized.reviewPeriodDays,
        exclusionNotes: normalized.exclusionNotes,
        active: normalized.active,
        sortOrder: normalized.sortOrder,
      },
    });
    await syncRates(tx, existing.id, normalized.commissionType, normalized.rates);
    await syncUnitRates(tx, existing.id, normalized.commissionType, normalized.unitRates);
    await syncEventRules(tx, existing.id, normalized.eventRules);
  });
  console.info('[affiliate-program] service updated', { pidService, actor });
  return serializeService(await serviceRecord(pidService));
}
