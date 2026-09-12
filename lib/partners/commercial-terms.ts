import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { encryptKyc } from './kyc-crypto';
import { ReviewError } from './review';
import { commercialTermsSchema } from './commercial-terms-policy';

export async function readCommercialTerms(partnerId: string) {
  const [partner] = await prisma.$queryRaw<Terms[]>`SELECT serviceChargeBps, partnerShareBps, pricingRevision, status, liveCollectionEnabled FROM procurement_partners WHERE id=${partnerId}`;
  if (!partner) throw new ReviewError('Partner not found.', 404);
  return partner;
}
type Terms = { serviceChargeBps: number; partnerShareBps: number; pricingRevision: number; status: string; liveCollectionEnabled: boolean };
export async function saveCommercialTerms(partnerId: string, actorPid: string, input: unknown) {
  const parsed = commercialTermsSchema.safeParse(input);
  if (!parsed.success) throw new ReviewError(parsed.error.issues[0]?.message || 'Review your percentages, reason and confirmation.', 422);
  const values = parsed.data;
  return prisma.$transaction(async tx => {
    const [current] = await tx.$queryRaw<Terms[]>`SELECT serviceChargeBps, partnerShareBps, pricingRevision, status, liveCollectionEnabled FROM procurement_partners WHERE id=${partnerId} FOR UPDATE`;
    if (!current) throw new ReviewError('Partner not found.', 404);
    if (!['PENDING', 'ACTIVE'].includes(current.status)) throw new ReviewError('Commercial terms can only be edited for pending or active partners.', 409);
    if (current.pricingRevision !== values.pricingRevision) throw new ReviewError('These terms changed since you opened the form. Refresh and review them before saving.', 409);
    if (current.serviceChargeBps === values.serviceChargeBps && current.partnerShareBps === values.partnerShareBps) return { changed: false, notificationId: null };
    const [kyc] = await tx.$queryRaw<Array<{ partnerId: string }>>`SELECT partnerId FROM procurement_partner_kyc WHERE partnerId=${partnerId}`;
    if (!kyc) throw new ReviewError('Business verification details are required before setting commercial terms.', 409);
    await tx.$executeRaw`UPDATE procurement_partners SET serviceChargeBps=${values.serviceChargeBps}, partnerShareBps=${values.partnerShareBps}, pricingRevision=pricingRevision+1, liveCollectionEnabled=false, updatedAt=NOW(3) WHERE id=${partnerId}`;
    const notificationId = randomUUID();
    const evidence = { before: { serviceChargeBps: current.serviceChargeBps, partnerShareBps: current.partnerShareBps, pricingRevision: current.pricingRevision }, after: { serviceChargeBps: values.serviceChargeBps, partnerShareBps: values.partnerShareBps, pricingRevision: current.pricingRevision + 1 }, reason: values.reason, actorPid, changedAt: new Date().toISOString() };
    const encrypted = encryptKyc(Buffer.from(JSON.stringify(evidence)), partnerId).toString('base64');
    await tx.$executeRaw`INSERT INTO procurement_partner_kyc_events (id, partnerId, actorPid, action, emailStatus, detailsCiphertext, createdAt) VALUES (${notificationId}, ${partnerId}, ${actorPid}, 'COMMERCIAL_TERMS_UPDATED', 'QUEUED', ${encrypted}, NOW(3))`;
    return { changed: true, notificationId };
  });
}
