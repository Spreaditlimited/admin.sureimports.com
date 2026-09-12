import 'server-only';
import { adminAgreement } from './agreement';
import { createHmac, hkdfSync, randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { encryptKyc, decryptKyc } from './kyc-crypto';
import { ReviewError } from './review';
import { activationBlockReason, activationSchema, PARTNER_ACTIVATION_ROLLOUT_READY } from './activation-policy';

export async function activatePartner(partnerId: string, actorPid: string, input: unknown) {
  const parsed = activationSchema.safeParse(input);
  if (!parsed.success) throw new ReviewError('Confirm the agreement and provide its reference and current revision.', 422);
  if (!PARTNER_ACTIVATION_ROLLOUT_READY) throw new ReviewError('Activation is disabled until membership protection is deployed and verified.', 409);
  const notificationId = randomUUID();
  const master = Buffer.from(process.env.AFFILIATE_SECURITY_KEY || '', 'base64');
  if (master.length !== 32) throw new Error('Membership identity key unavailable.');
  await prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{ ownerPidUser: string; businessStatus: string; kycStatus: string; revision: number; country: string; currency: string }>>`SELECT p.ownerPidUser, p.status AS businessStatus, k.status AS kycStatus, k.revision, p.country, p.settlementCurrency AS currency FROM procurement_partners p INNER JOIN procurement_partner_kyc k ON k.partnerId = p.id WHERE p.id = ${partnerId} FOR UPDATE`;
    const partner = rows[0];
    if (!partner) throw new ReviewError('Partner application not found.', 404);
    const fitRows = await tx.$queryRaw<Array<{ reviewCiphertext: string | null }>>`SELECT reviewCiphertext FROM procurement_partner_kyc WHERE partnerId=${partnerId} FOR UPDATE`;
    const review = fitRows[0]?.reviewCiphertext ? JSON.parse(decryptKyc(Buffer.from(fitRows[0].reviewCiphertext, 'base64'), partnerId).toString('utf8')) : {};
    if (review.businessFit?.decision !== 'PILOT_APPROVED' || !review.businessFit?.hardBlockersCleared) throw new ReviewError('Business-fit pilot approval is required before activation.', 409);
    const reason = activationBlockReason(partner, PARTNER_ACTIVATION_ROLLOUT_READY);
    if (reason) throw new ReviewError(reason, 409);
    if (partner.revision !== parsed.data.revision) throw new ReviewError('The application changed. Reload it before activation.', 409);
    const agreement = await adminAgreement(partnerId, tx);
    if (agreement.status !== 'AWAITING_CONFIRMATION' || !agreement.receipt || agreement.receipt.reference !== parsed.data.agreementReference) throw new ReviewError('Awaiting Agreement Acceptance by Business. The current agreement must be accepted before final confirmation.', 409);
    const owners = await tx.$queryRaw<Array<{ userEmail: string }>>`SELECT userEmail FROM users WHERE pidUser = ${partner.ownerPidUser} FOR UPDATE`;
    if (!owners[0]) throw new ReviewError('The owner account is unavailable.', 409);
    const email = owners[0].userEmail.trim().toLowerCase();
    const key = Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), 'affiliate-email-v1', 32));
    const emailHash = createHmac('sha256', key).update(email).digest('hex');
    const subjectId = `partner:${partnerId}`;
    await tx.$executeRaw`INSERT INTO commercial_program_memberships (emailHash, program, subjectId) VALUES (${emailHash}, 'PARTNER', ${subjectId}) ON DUPLICATE KEY UPDATE emailHash = VALUES(emailHash)`;
    const memberships = await tx.$queryRaw<Array<{ program: string; subjectId: string }>>`SELECT program, subjectId FROM commercial_program_memberships WHERE emailHash = ${emailHash} FOR UPDATE`;
    if (memberships[0]?.program !== 'PARTNER' || memberships[0]?.subjectId !== subjectId) throw new ReviewError('The owner already belongs to another commercial programme. Resolve membership before activation.', 409);
    const affiliates = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM affiliate_accounts WHERE emailHash = ${emailHash} LIMIT 1 FOR UPDATE`;
    if (affiliates.length) throw new ReviewError('The owner has an affiliate account. Membership transfer requires a separate reviewed process.', 409);
    const evidence = encryptKyc(Buffer.from(JSON.stringify({ agreementReference: parsed.data.agreementReference, actorPid, activatedAt: new Date().toISOString() })), partnerId).toString('base64');
    await tx.$executeRaw`UPDATE procurement_partners SET status = 'ACTIVE', approvedAt = NOW(3), updatedAt = NOW(3), liveCollectionEnabled = true, settlementPolicy = 'EARNINGS_WALLET' WHERE id = ${partnerId}`;
    await tx.$executeRaw`UPDATE procurement_partner_storefronts SET published = false, updatedAt = NOW(3) WHERE partnerId = ${partnerId}`;
    await tx.$executeRaw`UPDATE procurement_partner_kyc SET revision = revision + 1, updatedAt = NOW(3) WHERE partnerId = ${partnerId}`;
    await tx.$executeRaw`INSERT INTO procurement_partner_kyc_events (id, partnerId, actorPid, action, detailsCiphertext, emailStatus, createdAt) VALUES (${notificationId}, ${partnerId}, ${actorPid}, 'BUSINESS_ACTIVATED', ${evidence}, 'QUEUED', NOW(3))`;
  });
  return notificationId;
}
