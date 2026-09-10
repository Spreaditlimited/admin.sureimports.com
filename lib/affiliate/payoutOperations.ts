import 'server-only';

import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptAffiliateValue } from './security';
import { sendAffiliateAccountNotification } from './emailNotifications';

function clean(value: unknown, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function paystackSecret() {
  return clean(
    process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY ||
      process.env.PAYSTACK_SECRET_KEY,
    1000,
  );
}

async function paystack(path: string, init?: RequestInit) {
  const secret = paystackSecret();
  if (!secret) throw new Error('Paystack payouts are not configured.');
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status === false) {
    throw new Error(clean(result?.message, 400) || 'Paystack rejected the payout.');
  }
  return result;
}

function paypalBaseUrl() {
  const configured = clean(process.env.PAYPAL_BASE_URL, 500);
  if (configured) return configured.replace(/\/$/, '');
  return process.env.PAYPAL_ENVIRONMENT === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function paypalToken() {
  const clientId = clean(process.env.PAYPAL_CLIENT_ID, 1000);
  const secret = clean(process.env.PAYPAL_CLIENT_SECRET, 1000);
  if (!clientId || !secret) throw new Error('PayPal payouts are not configured.');
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.access_token) {
    throw new Error('PayPal authentication failed.');
  }
  return String(result.access_token);
}

async function paypal(path: string, init?: RequestInit) {
  const token = await paypalToken();
  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      clean(result?.message || result?.name, 400) || 'PayPal rejected the payout.',
    );
  }
  return result;
}

function details(ciphertext: string) {
  return JSON.parse(decryptAffiliateValue(ciphertext)) as {
    bankName?: string;
    accountName?: string;
    accountNumberMasked?: string;
    email?: string;
    emailMasked?: string;
  };
}

async function settlePayout(
  payoutId: number,
  status: 'PAID' | 'PROCESSING' | 'OTP_REQUIRED' | 'FAILED',
  providerStatus: string,
  externalReference?: string | null,
  failureReason?: string | null,
) {
  await prisma.$transaction(async (tx) => {
    await tx.affiliate_payouts.update({
      where: { id: payoutId },
      data: {
        status,
        providerStatus: clean(providerStatus, 80) || null,
        externalReference: externalReference || undefined,
        processedAt: status === 'PAID' ? new Date() : null,
        failedAt: status === 'FAILED' ? new Date() : null,
        failureReason: failureReason ? clean(failureReason, 500) : null,
        lastCheckedAt: new Date(),
      },
    });
    if (status === 'PAID') {
      const items = await tx.affiliate_payout_items.findMany({
        where: { payoutId },
        select: { conversionId: true },
      });
      await tx.affiliate_conversions.updateMany({
        where: {
          id: { in: items.map((item) => item.conversionId) },
          status: 'RESERVED',
        },
        data: { status: 'PAID' },
      });
    }
  });
  const payout = await prisma.affiliate_payouts.findUnique({
    where: { id: payoutId },
    select: { pidPayout: true, affiliateId: true, provider: true, currency: true, amount: true, failureReason: true },
  });
  if (payout) {
    const providerOutcome = providerStatus.toUpperCase();
    const reversed = status === 'FAILED' && ['REVERSED', 'RETURNED', 'REFUNDED'].some((value) => providerOutcome.includes(value));
    const notificationStatus = reversed ? 'REVERSED' : status;
    const statusCopy = status === 'PAID'
      ? {
          eventType: 'PAYOUT_PAID',
          subject: 'Your Sure Imports affiliate payout has been paid',
          title: 'Payout completed',
          message: 'Your affiliate payout was completed successfully. Provider processing times may affect when the funds appear at your destination.',
        }
      : status === 'FAILED'
        ? reversed
          ? {
              eventType: 'PAYOUT_REVERSED',
              subject: 'Your Sure Imports affiliate payout was reversed',
              title: 'Payout reversed',
              message: 'The payment provider reported that this payout was returned or reversed. Review the payout page or contact support if you need assistance.',
            }
          : {
              eventType: 'PAYOUT_FAILED',
              subject: 'Your Sure Imports affiliate payout needs attention',
              title: 'Payout was not completed',
              message: payout.failureReason || 'The payout provider could not complete this payout. Review the payout page for the latest status.',
            }
        : {
            eventType: 'PAYOUT_PROCESSING',
            subject: 'Your Sure Imports affiliate payout is processing',
            title: status === 'OTP_REQUIRED' ? 'Payout requires authorization' : 'Payout is processing',
            message: status === 'OTP_REQUIRED'
              ? 'Paystack requires an administrator authorization code before this payout can continue.'
              : 'Your payout has been approved and submitted to the payment provider for processing.',
          };
    after(() => sendAffiliateAccountNotification({
      affiliateId: payout.affiliateId,
      eventKey: `payout:${notificationStatus.toLowerCase()}:${payout.pidPayout}`,
      ...statusCopy,
      facts: [
        { label: 'Reference', value: payout.pidPayout },
        { label: 'Provider', value: payout.provider },
        { label: 'Amount', value: new Intl.NumberFormat(payout.currency === 'NGN' ? 'en-NG' : 'en-US', { style: 'currency', currency: payout.currency }).format(Number(payout.amount)) },
        { label: 'Status', value: notificationStatus.replaceAll('_', ' ') },
      ],
      actionLabel: 'Track payout',
      actionPath: '/dashboard/payouts',
    }));
  }
}

export async function executeAffiliatePayout(pidPayout: string, actor: string) {
  const existing = await prisma.affiliate_payouts.findUnique({
    where: { pidPayout },
    select: { status: true, externalReference: true },
  });
  if (existing?.status === 'FAILED' && existing.externalReference) {
    throw new Error('This payout already reached the provider. Reconcile or cancel it before creating a new request.');
  }
  const claimed = await prisma.affiliate_payouts.updateMany({
    where: { pidPayout, status: { in: ['REQUESTED', 'FAILED'] } },
    data: {
      status: 'PROCESSING',
      approvedAt: new Date(),
      approvedBy: clean(actor, 191),
      failureReason: null,
      failedAt: null,
      attemptCount: { increment: 1 },
    },
  });
  if (claimed.count !== 1) throw new Error('This payout cannot be started from its current status.');

  const payout = await prisma.affiliate_payouts.findUnique({
    where: { pidPayout },
    include: {
      payoutAccount: true,
      items: { include: { conversion: true } },
    },
  });
  if (!payout?.payoutAccount || payout.payoutAccount.status !== 'VERIFIED') {
    await settlePayout(payout!.id, 'FAILED', 'ACCOUNT_UNAVAILABLE', null, 'Verified payout account was not found.');
    throw new Error('Verified payout account was not found.');
  }
  if (
    payout.provider !== payout.payoutAccount.provider ||
    payout.currency !== payout.payoutAccount.currency
  ) {
    await settlePayout(payout.id, 'FAILED', 'ACCOUNT_MISMATCH', null, 'Payout destination does not match the payout currency.');
    throw new Error('Payout destination does not match the payout currency.');
  }
  const reservedTotal = payout.items.reduce(
    (total, item) => total + Number(item.conversion.commissionAmount),
    0,
  );
  const payoutAmount = Number(payout.amount);
  if (
    payout.items.length === 0 ||
    payout.items.some((item) => item.conversion.status !== 'RESERVED') ||
    Math.abs(reservedTotal - payoutAmount) > 0.0001
  ) {
    await settlePayout(
      payout.id,
      'FAILED',
      'LEDGER_MISMATCH',
      payout.externalReference,
      'The reserved commission ledger no longer matches this payout.',
    );
    throw new Error('The reserved commission ledger no longer matches this payout. Cancel it and review the commissions.');
  }

  after(() => sendAffiliateAccountNotification({
    affiliateId: payout.affiliateId,
    eventKey: `payout:processing:${payout.pidPayout}`,
    eventType: 'PAYOUT_PROCESSING',
    subject: 'Your Sure Imports affiliate payout was approved',
    title: 'Payout approved',
    message: 'Your payout has been approved and is being submitted to the payment provider.',
    facts: [
      { label: 'Reference', value: payout.pidPayout },
      { label: 'Provider', value: payout.provider },
      { label: 'Amount', value: new Intl.NumberFormat(payout.currency === 'NGN' ? 'en-NG' : 'en-US', { style: 'currency', currency: payout.currency }).format(Number(payout.amount)) },
    ],
    actionLabel: 'Track payout',
    actionPath: '/dashboard/payouts',
  }));

  try {
    if (payout.provider === 'PAYSTACK' && payout.currency === 'NGN') {
      if (!payout.payoutAccount.recipientReference) {
        throw new Error('Paystack recipient is missing.');
      }
      const result = await paystack('/transfer', {
        method: 'POST',
        body: JSON.stringify({
          source: 'balance',
          amount: Math.round(Number(payout.amount) * 100),
          recipient: payout.payoutAccount.recipientReference,
          reason: `Sure Imports affiliate payout ${payout.pidPayout}`,
          currency: 'NGN',
          reference: payout.pidPayout,
        }),
      });
      const providerStatus = clean(result?.data?.status, 80).toLowerCase();
      const reference = clean(result?.data?.transfer_code, 180);
      const status = providerStatus === 'success'
        ? 'PAID'
        : providerStatus === 'otp'
          ? 'OTP_REQUIRED'
          : 'PROCESSING';
      await settlePayout(payout.id, status, providerStatus, reference);
      return { status, providerStatus };
    }

    if (payout.provider === 'PAYPAL' && payout.currency === 'USD') {
      const destination = details(payout.payoutAccount.detailsCiphertext);
      if (!destination.email) throw new Error('PayPal payout email is missing.');
      const result = await paypal('/v1/payments/payouts', {
        method: 'POST',
        body: JSON.stringify({
          sender_batch_header: {
            sender_batch_id: payout.pidPayout,
            email_subject: 'Your Sure Imports affiliate payout',
            email_message: 'Your Sure Imports affiliate commission payout has been sent.',
          },
          items: [{
            recipient_type: 'EMAIL',
            amount: { value: Number(payout.amount).toFixed(2), currency: 'USD' },
            receiver: destination.email,
            note: `Sure Imports affiliate payout ${payout.pidPayout}`,
            sender_item_id: payout.pidPayout,
          }],
        }),
      });
      const reference = clean(result?.batch_header?.payout_batch_id, 180);
      const providerStatus = clean(result?.batch_header?.batch_status, 80) || 'PENDING';
      await settlePayout(payout.id, 'PROCESSING', providerStatus, reference);
      return { status: 'PROCESSING', providerStatus };
    }
    throw new Error('Payout provider and currency are not supported.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provider payout failed.';
    await settlePayout(payout.id, 'FAILED', 'FAILED', payout.externalReference, message);
    throw error;
  }
}

export async function finalizePaystackPayoutOtp(pidPayout: string, otpInput: string) {
  const payout = await prisma.affiliate_payouts.findUnique({ where: { pidPayout } });
  if (!payout || payout.provider !== 'PAYSTACK' || payout.status !== 'OTP_REQUIRED' || !payout.externalReference) {
    throw new Error('This payout is not awaiting a Paystack OTP.');
  }
  const otp = clean(otpInput, 10).replace(/\D/g, '');
  if (otp.length < 4) throw new Error('Enter the Paystack transfer OTP.');
  const result = await paystack('/transfer/finalize_transfer', {
    method: 'POST',
    body: JSON.stringify({ transfer_code: payout.externalReference, otp }),
  });
  const providerStatus = clean(result?.data?.status, 80).toLowerCase();
  const status = providerStatus === 'success' ? 'PAID' : 'PROCESSING';
  await settlePayout(payout.id, status, providerStatus, payout.externalReference);
  return { status };
}

export async function reconcileAffiliatePayout(pidPayout: string) {
  const payout = await prisma.affiliate_payouts.findUnique({ where: { pidPayout } });
  if (!payout || !payout.externalReference) throw new Error('Provider payout reference was not found.');
  if (payout.provider === 'PAYSTACK') {
    const result = await paystack(`/transfer/verify/${encodeURIComponent(payout.externalReference)}`);
    const providerStatus = clean(result?.data?.status, 80).toLowerCase();
    const status = providerStatus === 'success'
      ? 'PAID'
      : ['failed', 'reversed'].includes(providerStatus)
        ? 'FAILED'
        : providerStatus === 'otp'
          ? 'OTP_REQUIRED'
          : 'PROCESSING';
    await settlePayout(payout.id, status, providerStatus, payout.externalReference, status === 'FAILED' ? clean(result?.data?.reason, 500) : null);
    return { status };
  }
  if (payout.provider === 'PAYPAL') {
    const result = await paypal(`/v1/payments/payouts/${encodeURIComponent(payout.externalReference)}`);
    const itemStatus = clean(result?.items?.[0]?.transaction_status, 80).toUpperCase();
    const batchStatus = clean(result?.batch_header?.batch_status, 80).toUpperCase();
    const providerStatus = itemStatus || batchStatus;
    const status = itemStatus === 'SUCCESS'
      ? 'PAID'
      : ['FAILED', 'RETURNED', 'BLOCKED', 'REFUNDED', 'REVERSED', 'CANCELED'].includes(itemStatus) ||
          ['DENIED', 'CANCELED'].includes(batchStatus)
        ? 'FAILED'
        : 'PROCESSING';
    await settlePayout(payout.id, status, providerStatus, payout.externalReference, status === 'FAILED' ? providerStatus : null);
    return { status };
  }
  throw new Error('Unsupported payout provider.');
}

export async function cancelAffiliatePayout(pidPayout: string, actor: string) {
  const payout = await prisma.$transaction(async (tx) => {
    const payout = await tx.affiliate_payouts.findUnique({
      where: { pidPayout },
      include: { items: true },
    });
    if (!payout || !['REQUESTED', 'FAILED'].includes(payout.status)) {
      throw new Error('Only requested or failed payouts can be cancelled.');
    }
    await tx.affiliate_conversions.updateMany({
      where: { id: { in: payout.items.map((item) => item.conversionId) }, status: 'RESERVED' },
      data: { status: 'AVAILABLE' },
    });
    await tx.affiliate_payout_items.deleteMany({ where: { payoutId: payout.id } });
    return tx.affiliate_payouts.update({
      where: { id: payout.id },
      data: { status: 'CANCELLED', failureReason: `Cancelled by ${clean(actor, 180)}` },
    });
  });
  after(() => sendAffiliateAccountNotification({
    affiliateId: payout.affiliateId,
    eventKey: `payout:cancelled:${payout.pidPayout}`,
    eventType: 'PAYOUT_CANCELLED',
    subject: 'Your Sure Imports affiliate payout was cancelled',
    title: 'Payout cancelled',
    message: 'This payout request was cancelled and its eligible commissions were returned to your available balance.',
    facts: [
      { label: 'Reference', value: payout.pidPayout },
      { label: 'Amount', value: new Intl.NumberFormat(payout.currency === 'NGN' ? 'en-NG' : 'en-US', { style: 'currency', currency: payout.currency }).format(Number(payout.amount)) },
    ],
    actionLabel: 'Review payouts',
    actionPath: '/dashboard/payouts',
  }));
  return payout;
}

export async function listAffiliatePayoutOperations() {
  const payouts = await prisma.affiliate_payouts.findMany({
    include: {
      affiliate: true,
      payoutAccount: true,
      _count: { select: { items: true } },
    },
    orderBy: { requestedAt: 'desc' },
    take: 100,
  });
  return payouts.map((payout) => {
    const destination = payout.payoutAccount
      ? details(payout.payoutAccount.detailsCiphertext)
      : {};
    return {
      pidPayout: payout.pidPayout,
      affiliate: `${decryptAffiliateValue(payout.affiliate.firstNameCiphertext)} ${decryptAffiliateValue(payout.affiliate.lastNameCiphertext)}`.trim(),
      referralCode: payout.affiliate.referralCode,
      provider: payout.provider,
      currency: payout.currency,
      amount: Number(payout.amount),
      status: payout.status,
      providerStatus: payout.providerStatus,
      externalReference: payout.externalReference,
      requestedAt: payout.requestedAt,
      destination: destination.accountNumberMasked
        ? `${destination.bankName || 'Bank'} · ${destination.accountNumberMasked}`
        : destination.emailMasked || 'Unavailable',
      itemCount: payout._count.items,
      failureReason: payout.failureReason,
    };
  });
}

export async function listAffiliateConversionsForReview() {
  const conversions = await prisma.affiliate_conversions.findMany({
    where: { status: { in: ['PENDING', 'AVAILABLE', 'VOIDED'] } },
    include: { affiliate: true, service: true, payoutItem: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return conversions.map((conversion) => ({
    pidConversion: conversion.pidConversion,
    affiliate: `${decryptAffiliateValue(conversion.affiliate.firstNameCiphertext)} ${decryptAffiliateValue(conversion.affiliate.lastNameCiphertext)}`.trim(),
    referralCode: conversion.affiliate.referralCode,
    service: conversion.service.displayName,
    orderReference: conversion.externalOrderReference,
    paymentCurrency: conversion.paymentCurrency,
    grossAmount: Number(conversion.grossAmount),
    eligibleAmount: Number(conversion.eligibleAmount),
    commissionCurrency: conversion.commissionCurrency,
    commissionAmount: Number(conversion.commissionAmount),
    status: conversion.status,
    createdAt: conversion.createdAt,
    lockedToPayout: Boolean(conversion.payoutItem),
  }));
}

export async function reviewAffiliateConversion(
  pidConversion: string,
  decision: 'AVAILABLE' | 'VOIDED',
) {
  const conversion = await prisma.affiliate_conversions.findUnique({
    where: { pidConversion },
    include: { payoutItem: true, service: { select: { displayName: true } } },
  });
  if (!conversion) throw new Error('Commission was not found.');
  if (conversion.payoutItem) throw new Error('A commission reserved for payout cannot be changed.');
  if (decision === 'AVAILABLE' && conversion.status !== 'PENDING') {
    throw new Error('Only pending commissions can be approved.');
  }
  if (decision === 'VOIDED' && !['PENDING', 'AVAILABLE'].includes(conversion.status)) {
    throw new Error('This commission cannot be voided.');
  }
  const updated = await prisma.affiliate_conversions.update({
    where: { id: conversion.id },
    data: decision === 'AVAILABLE'
      ? { status: 'AVAILABLE', approvedAt: new Date(), availableAt: new Date(), voidedAt: null }
      : {
          status: 'VOIDED',
          voidedAt: new Date(),
          reversedFromStatus: conversion.status,
          reversalReason: 'Commission was voided during administrator review.',
          reversalReference: `admin-review:${pidConversion}`,
        },
  });
  return { ...updated, serviceName: conversion.service.displayName };
}
