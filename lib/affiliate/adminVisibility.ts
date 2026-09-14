import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decryptAffiliateValue } from '@/lib/affiliate/security';

export const PAGE_SIZE = 25;
export type SearchParams = Record<string, string | string[] | undefined>;
export const textParam = (value: SearchParams[string]) => typeof value === 'string' ? value.trim().slice(0, 191) : '';
export function recordId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
export function pagination(value: SearchParams[string], total: number) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number(textParam(value));
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, pages) : 1;
  return { page, pages, total, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}
export function customerPaymentScope(reference: string | null) {
  // Never infer ownership from names, email, tracking cookies or order substrings.
  return {
    main: reference && !reference.startsWith('linescout:') ? reference : null,
    ledger: reference || null,
  };
}
export function privateText(value: string | null) {
  if (!value) return '—';
  try { return decryptAffiliateValue(value); } catch { return 'Unavailable'; }
}
export async function affiliateAccount(id: number) {
  const account = await prisma.affiliate_accounts.findUnique({ where: { id }, select: {
    id: true, pidAffiliate: true, firstNameCiphertext: true, lastNameCiphertext: true,
    emailCiphertext: true, phoneCiphertext: true, country: true, status: true, referralCode: true,
    createdAt: true, lastLoginAt: true, emailVerifiedAt: true, termsAcceptedAt: true, consentVersion: true,
    referralAliases: { select: { id: true, aliasCode: true, sourceSystem: true, active: true } },
    payoutAccounts: { select: { id: true, provider: true, currency: true, status: true, verifiedAt: true } },
    _count: { select: { referrals: true, conversions: true, payouts: true, shippingAttributions: true } },
  } });
  if (!account) return null;
  const { firstNameCiphertext, lastNameCiphertext, emailCiphertext, phoneCiphertext, ...safe } = account;
  return { ...safe, name: `${privateText(firstNameCiphertext)} ${privateText(lastNameCiphertext)}`, email: privateText(emailCiphertext), phone: privateText(phoneCiphertext) };
}
export async function customerNames(references: (string | null)[]) {
  const ids = [...new Set(references.filter((ref): ref is string => Boolean(ref && !ref.startsWith('linescout:'))))];
  if (!ids.length) return new Map<string, { name: string; email: string }>();
  const users = await prisma.users.findMany({ where: { pidUser: { in: ids } }, select: {
    pidUser: true, userFirstname: true, userLastname: true, userEmail: true,
  } });
  return new Map(users.map(user => [user.pidUser, { name: [user.userFirstname, user.userLastname].filter(Boolean).join(' ') || 'Registered customer', email: user.userEmail }]));
}
export async function commissionSummary(affiliateId: number, referralId?: number) {
  return prisma.affiliate_conversions.groupBy({
    by: ['commissionCurrency', 'status'], where: { affiliateId, ...(referralId ? { referralId } : {}) },
    _sum: { commissionAmount: true }, _count: { _all: true },
    orderBy: [{ commissionCurrency: 'asc' }, { status: 'asc' }],
  });
}
export const conversionSelect = {
  id: true, pidConversion: true, referralId: true, externalOrderReference: true, externalPaymentReference: true,
  sourceSystem: true, sourceEventKey: true, paymentCurrency: true, grossAmount: true, eligibleAmount: true,
  commissionCurrency: true, commissionAmount: true, commissionBasisUnit: true, commissionBasisQuantity: true,
  commissionRate: true, status: true, releaseMode: true, releaseAt: true, approvedAt: true, availableAt: true,
  voidedAt: true, reversalReason: true, reversalReference: true, createdAt: true,
  service: { select: { displayName: true } },
  referral: { select: { customerReference: true } },
  payoutItem: { select: { amount: true, payout: { select: { pidPayout: true, status: true, currency: true, requestedAt: true } } } },
} as const;

export type RefundAdjustment = { conversionId: number; refundId: string; amount: string; currency: string; createdAt: Date };
export async function withRefundAdjustments<T extends { id: number }>(rows: T[]) {
  const adjustments = rows.length ? await prisma.$queryRaw<RefundAdjustment[]>(Prisma.sql`
    SELECT conversionId, refundId, CAST(amount AS CHAR) AS amount, currency, createdAt
    FROM affiliate_refund_adjustments WHERE conversionId IN (${Prisma.join(rows.map(row => row.id))})
    ORDER BY createdAt DESC
  `) : [];
  return rows.map(row => ({ ...row, refundAdjustments: adjustments.filter(item => item.conversionId === row.id) }));
}
export type RefundSettlement = { refundId: string; sourceCurrency: string; settlementCurrency: string; settlementAmount: string; exchangeRate: string; method: string; status: string; reference: string | null; settledAt: Date | null };
export async function refundSettlements(pidUser: string, refundIds: string[]) {
  if (!refundIds.length) return [];
  return prisma.$queryRaw<RefundSettlement[]>(Prisma.sql`
    SELECT refundId, sourceCurrency, settlementCurrency, CAST(settlementAmount AS CHAR) AS settlementAmount,
      CAST(exchangeRate AS CHAR) AS exchangeRate, method, status, reference, settledAt
    FROM refund_settlements WHERE pidUser=${pidUser} AND refundId IN (${Prisma.join(refundIds)})
  `);
}
