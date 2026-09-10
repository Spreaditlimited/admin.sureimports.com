import 'server-only';

import { Prisma } from '@prisma/client';
import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendAffiliateAccountNotification } from '@/lib/affiliate/emailNotifications';

export async function reverseAffiliateConversions(input: {
  externalOrderReference?: string;
  externalPaymentReferences?: string[];
  reason: string;
  reversalReference?: string;
}) {
  const orderReference = input.externalOrderReference?.trim().slice(0, 120);
  const paymentReferences = (input.externalPaymentReferences || [])
    .map((reference) => reference.trim().slice(0, 160))
    .filter(Boolean);
  if (!orderReference && !paymentReferences.length) return 0;

  const match = {
    status: { not: 'VOIDED' },
    OR: [
      ...(orderReference ? [{ externalOrderReference: orderReference }] : []),
      ...(paymentReferences.length ? [{ externalPaymentReference: { in: paymentReferences } }] : []),
    ],
  } satisfies Prisma.affiliate_conversionsWhereInput;

  const result = await prisma.$transaction(async (tx) => {
    const conversions = await tx.affiliate_conversions.findMany({
      where: match,
      select: {
        id: true,
        pidConversion: true,
        affiliateId: true,
        status: true,
        externalOrderReference: true,
        commissionCurrency: true,
        commissionAmount: true,
        service: { select: { displayName: true } },
        payoutItem: { select: { payoutId: true, payout: { select: { status: true } } } },
      },
    });
    if (!conversions.length) return { conversions: [], cancelledPayouts: [] };

    const targetIds = conversions.map((conversion) => conversion.id);
    const cancelablePayoutIds = [...new Set(conversions
      .filter((conversion) => conversion.payoutItem && ['REQUESTED', 'FAILED'].includes(conversion.payoutItem.payout.status))
      .map((conversion) => conversion.payoutItem!.payoutId))];
    const cancelledPayouts = cancelablePayoutIds.length ? await tx.affiliate_payouts.findMany({
      where: { id: { in: cancelablePayoutIds } },
      select: { id: true, pidPayout: true, affiliateId: true, currency: true, amount: true },
    }) : [];

    for (const payoutId of cancelablePayoutIds) {
      const items = await tx.affiliate_payout_items.findMany({
        where: { payoutId },
        select: { conversionId: true },
      });
      await tx.affiliate_conversions.updateMany({
        where: {
          id: { in: items.map((item) => item.conversionId).filter((id) => !targetIds.includes(id)) },
          status: 'RESERVED',
        },
        data: { status: 'AVAILABLE' },
      });
      await tx.affiliate_payout_items.deleteMany({ where: { payoutId } });
      await tx.affiliate_payouts.update({
        where: { id: payoutId },
        data: {
          status: 'CANCELLED',
          failureReason: 'Cancelled automatically because an included commission was reversed.',
        },
      });
    }

    for (const status of [...new Set(conversions.map((conversion) => conversion.status))]) {
      await tx.affiliate_conversions.updateMany({
        where: {
          id: { in: conversions.filter((conversion) => conversion.status === status).map((conversion) => conversion.id) },
          status,
        },
        data: {
          status: 'VOIDED',
          voidedAt: new Date(),
          reversedFromStatus: status,
          reversalReason: input.reason.trim().slice(0, 1000) || 'Payment reversed',
          reversalReference: input.reversalReference?.trim().slice(0, 160) || null,
        },
      });
    }
    return { conversions, cancelledPayouts };
  }, { maxWait: 10_000, timeout: 20_000 });

  if (result.conversions.length || result.cancelledPayouts.length) {
    after(() => Promise.all([
      ...result.conversions.map((conversion) => sendAffiliateAccountNotification({
        affiliateId: conversion.affiliateId,
        eventKey: `commission:voided:${conversion.pidConversion}`,
        eventType: 'COMMISSION_VOIDED',
        subject: 'An affiliate commission was reversed',
        title: 'Commission reversed',
        message: input.reason,
        facts: [
          { label: 'Service', value: conversion.service.displayName },
          { label: 'Order reference', value: conversion.externalOrderReference },
          { label: 'Commission', value: new Intl.NumberFormat(conversion.commissionCurrency === 'NGN' ? 'en-NG' : 'en-US', { style: 'currency', currency: conversion.commissionCurrency }).format(Number(conversion.commissionAmount)) },
          { label: 'Previous status', value: conversion.status },
        ],
        actionLabel: 'Review commission ledger',
        actionPath: '/dashboard/earnings',
      })),
      ...result.cancelledPayouts.map((payout) => sendAffiliateAccountNotification({
        affiliateId: payout.affiliateId,
        eventKey: `payout:cancelled:${payout.pidPayout}`,
        eventType: 'PAYOUT_CANCELLED',
        subject: 'Your affiliate payout request was cancelled',
        title: 'Payout request cancelled',
        message: 'This payout request was cancelled because one of its included commissions was reversed. Any unaffected commissions have been returned to your available balance.',
        facts: [
          { label: 'Reference', value: payout.pidPayout },
          { label: 'Amount', value: new Intl.NumberFormat(payout.currency === 'NGN' ? 'en-NG' : 'en-US', { style: 'currency', currency: payout.currency }).format(Number(payout.amount)) },
        ],
        actionLabel: 'Review payouts',
        actionPath: '/dashboard/payouts',
      })),
    ]).then(() => undefined));
  }
  return result.conversions.length;
}

export function affiliateOrderReferenceForRefund(serviceType: string | null | undefined, pidOrder: string | null | undefined) {
  const order = String(pidOrder || '').trim();
  if (!order) return null;
  const service = String(serviceType || '').trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');
  if (service === 'PROCUREMENT' || service === 'BUY_FROM_CHINESE_WEBSITES') return `procurement:${order}`;
  if (service === 'PAY_SMALL_SMALL') return `pay-small-small:${order}`;
  if (service === 'SHOP' || service === 'PHONES_AND_LAPTOPS') return `shop:${order}`;
  if (service === 'SUPPLIER_REPORTS') return `supplier-report:${order}`;
  if (service === 'SUPPLIER_VERIFICATION') return `supplier-verification:${order}`;
  return null;
}
