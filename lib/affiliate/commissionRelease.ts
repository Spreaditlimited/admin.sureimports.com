import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendAffiliateAccountNotification } from '@/lib/affiliate/emailNotifications';

type EligibleConversion = {
  id: number;
};

export type CommissionReleaseResult = {
  checked: number;
  released: number;
  skipped: number;
  notificationFailures: number;
  conversionIds: string[];
};

const money = (amount: Prisma.Decimal, currency: string) => new Intl.NumberFormat(
  currency === 'NGN' ? 'en-NG' : 'en-US',
  { style: 'currency', currency, maximumFractionDigits: 2 },
).format(Number(amount));

export async function releaseMatureAffiliateCommissions(input?: {
  limit?: number;
  now?: Date;
}) {
  const limit = Math.min(Math.max(Math.trunc(input?.limit || 100), 1), 250);
  const now = input?.now || new Date();
  const eligible = await prisma.$queryRaw<EligibleConversion[]>(Prisma.sql`
    SELECT conversion.id
    FROM affiliate_conversions conversion
    LEFT JOIN affiliate_payout_items payoutItem ON payoutItem.conversionId = conversion.id
    WHERE conversion.status = 'PENDING'
      AND conversion.releaseMode = 'AUTOMATIC'
      AND payoutItem.id IS NULL
      AND conversion.releaseAt <= ${now}
    ORDER BY conversion.createdAt ASC, conversion.id ASC
    LIMIT ${limit}
  `);

  const released = [];
  let skipped = 0;
  for (const candidate of eligible) {
    const claimed = await prisma.affiliate_conversions.updateMany({
      where: { id: candidate.id, status: 'PENDING', payoutItem: { is: null } },
      data: { status: 'AVAILABLE', approvedAt: now, availableAt: now, voidedAt: null },
    });
    if (claimed.count !== 1) {
      skipped += 1;
      continue;
    }
    const conversion = await prisma.affiliate_conversions.findUnique({
      where: { id: candidate.id },
      include: { service: { select: { displayName: true } } },
    });
    if (conversion) released.push(conversion);
  }

  const notifications = await Promise.allSettled(released.map((conversion) => sendAffiliateAccountNotification({
    affiliateId: conversion.affiliateId,
    eventKey: `commission:available:${conversion.pidConversion}`,
    eventType: 'COMMISSION_AVAILABLE',
    subject: 'Your affiliate commission is now available',
    title: 'Commission released',
    message: 'Your commission has completed its configured review period and is now available for payout.',
    facts: [
      { label: 'Service', value: conversion.service.displayName },
      { label: 'Order reference', value: conversion.externalOrderReference },
      { label: 'Commission', value: money(conversion.commissionAmount, conversion.commissionCurrency) },
      { label: 'Status', value: 'Available' },
    ],
    actionLabel: 'Review commission ledger',
    actionPath: '/dashboard/earnings',
  })));

  return {
    checked: eligible.length,
    released: released.length,
    skipped,
    notificationFailures: notifications.filter((result) => result.status === 'rejected').length,
    conversionIds: released.map((conversion) => conversion.pidConversion),
  } satisfies CommissionReleaseResult;
}
