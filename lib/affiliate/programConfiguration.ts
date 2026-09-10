import 'server-only';

import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const CURRENCIES = ['NGN', 'USD'] as const;
type Currency = (typeof CURRENCIES)[number];
type CommissionType = 'FIXED' | 'PERCENTAGE';
type ApprovalMode = 'MANUAL' | 'AUTOMATIC';
type NormalizedRate = { currency: Currency; fixedAmount: Prisma.Decimal | null; active: boolean };

type RateInput = {
  currency?: unknown;
  fixedAmount?: unknown;
  active?: unknown;
};

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
  if (!['FIXED', 'PERCENTAGE'].includes(commissionType)) throw new Error('Select a valid commission type.');
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
    rates,
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
  };
}

function serviceRecord(pidService: string) {
  return prisma.affiliate_program_services.findUniqueOrThrow({
    where: { pidService },
    include: {
      currencyRates: { orderBy: { currency: 'asc' } },
      _count: { select: { conversions: true } },
    },
  });
}

export async function listAffiliateProgramServices() {
  const services = await prisma.affiliate_program_services.findMany({
    orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
    include: {
      currencyRates: { orderBy: { currency: 'asc' } },
      _count: { select: { conversions: true } },
    },
  });
  return services.map(serializeService);
}

async function syncRates(tx: Prisma.TransactionClient, serviceId: number, commissionType: CommissionType, rates: ReturnType<typeof normalizeInput>['rates']) {
  if (commissionType === 'PERCENTAGE') {
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
  });
  console.info('[affiliate-program] service updated', { pidService, actor });
  return serializeService(await serviceRecord(pidService));
}
