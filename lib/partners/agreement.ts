import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decryptKyc } from './kyc-crypto';
import { AGREEMENT_ACTION, agreementWorkflow, type AgreementBusiness, type AgreementReceipt } from './agreement-policy';

export async function adminAgreement(partnerId: string, db: Prisma.TransactionClient = prisma) {
  const businesses = await db.$queryRaw<Array<AgreementBusiness & { status: string; kycStatus: string; revision: number; reviewCiphertext: string | null; bankVerifiedAt: Date | null; paystackSubaccountCode: string | null }>>`SELECT p.id, p.ownerPidUser, p.legalName, p.registrationNumber, p.businessType, p.country, p.settlementCurrency, p.serviceChargeBps, p.partnerShareBps, p.pricingRevision, p.status, p.bankVerifiedAt, p.paystackSubaccountCode, k.status AS kycStatus, k.revision, k.reviewCiphertext FROM procurement_partners p INNER JOIN procurement_partner_kyc k ON k.partnerId=p.id WHERE p.id=${partnerId} LIMIT 1`;
  const business = businesses[0];
  if (!business) return { status: 'LOCKED' as const, current: false, receipt: null, paymentReady: false };
  const records = await db.$queryRaw<Array<{ action: string; detailsCiphertext: string | null }>>`SELECT action, detailsCiphertext FROM procurement_partner_kyc_events WHERE partnerId=${partnerId} AND action IN (${AGREEMENT_ACTION}, 'BUSINESS_ACTIVATED') ORDER BY createdAt DESC, id DESC LIMIT 100`;
  const decode = (value: string | null | undefined) => value ? JSON.parse(decryptKyc(Buffer.from(value, 'base64'), partnerId).toString('utf8')) : null;
  const receipt: AgreementReceipt | null = decode(records.find(row => row.action === AGREEMENT_ACTION)?.detailsCiphertext);
  const activated = decode(records.find(row => row.action === 'BUSINESS_ACTIVATED')?.detailsCiphertext);
  const confirmation = activated ? { reference: activated.agreementReference, confirmedAt: activated.activatedAt } : null;
  return { ...agreementWorkflow(business, { status: business.kycStatus, revision: business.revision }, decode(business.reviewCiphertext) || {}, receipt, confirmation), receipt, paymentReady: false };
}
