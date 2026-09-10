import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';

export async function recordProcurementAffiliateConversion(
  tx: Prisma.TransactionClient,
  input: {
    pidUser: string;
    pidOrder: string;
    paymentReference: string;
    paymentCurrency: string;
    grossAmount: number;
    eligibleAmount: number;
  },
) {
  const currency = input.paymentCurrency.trim().toUpperCase();
  if (!['NGN', 'USD'].includes(currency) || input.eligibleAmount <= 0) return;

  const [service, referral] = await Promise.all([
    tx.affiliate_program_services.findFirst({
      where: { serviceKey: 'BUY_FROM_CHINESE_WEBSITES', active: true },
    }),
    tx.affiliate_referrals.findUnique({
      where: { customerReference: input.pidUser },
      include: { affiliate: { select: { status: true } } },
    }),
  ]);
  if (
    !service ||
    service.commissionType !== 'PERCENTAGE' ||
    !service.percentageRate ||
    !referral ||
    referral.affiliate.status !== 'ACTIVE'
  ) {
    return;
  }

  const externalOrderReference = `procurement:${input.pidOrder}`;
  const externalPaymentReference = `bank:${input.paymentReference}`;
  const existing = await tx.affiliate_conversions.findFirst({
    where: {
      OR: [
        { externalPaymentReference },
        { externalOrderReference, serviceId: service.id },
      ],
    },
    select: { id: true },
  });
  if (existing) return;

  const grossAmount = new Prisma.Decimal(input.grossAmount).toDecimalPlaces(2);
  const eligibleAmount = new Prisma.Decimal(input.eligibleAmount).toDecimalPlaces(2);
  const commissionAmount = eligibleAmount
    .mul(service.percentageRate)
    .div(100)
    .toDecimalPlaces(2);
  const releaseMode = service.approvalMode === 'AUTOMATIC' ? 'AUTOMATIC' : 'MANUAL';
  const releaseAt = releaseMode === 'AUTOMATIC'
    ? new Date(Date.now() + service.reviewPeriodDays * 24 * 60 * 60 * 1000)
    : null;

  await tx.affiliate_conversions.create({
    data: {
      pidConversion: `aconv_${randomBytes(18).toString('base64url')}`,
      affiliateId: referral.affiliateId,
      serviceId: service.id,
      referralId: referral.id,
      externalOrderReference,
      externalPaymentReference,
      paymentCurrency: currency,
      grossAmount,
      eligibleAmount,
      commissionCurrency: currency,
      commissionAmount,
      status: 'PENDING',
      releaseMode,
      releaseAt,
    },
  });
  await tx.affiliate_referrals.updateMany({
    where: { id: referral.id, convertedAt: null },
    data: { convertedAt: new Date() },
  });
}
