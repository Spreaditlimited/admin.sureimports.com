import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { decryptKyc, encryptKyc } from './kyc-crypto';
import { ReviewError } from './review';
import { fitPolicyVersion, readinessForAssessment, weightedFitScore } from './business-fit-policy';
import { generateFitAssessment } from './business-fit-ai';

type Row = { revision: number; status: string; businessStatus: string; detailsCiphertext: string | null; reviewCiphertext: string | null };
const decode = (value: string | null, id: string) => value ? JSON.parse(decryptKyc(Buffer.from(value, 'base64'), id).toString('utf8')) : {};
const encode = (value: unknown, id: string) => encryptKyc(Buffer.from(JSON.stringify(value)), id).toString('base64');
const hashAnswers = (answers: unknown, model: string) => createHash('sha256').update(JSON.stringify([fitPolicyVersion, model, readinessForAssessment(answers)])).digest('hex');

export async function assessBusinessFit(id: string, actorPid: string) {
  const model = process.env.PARTNER_FIT_MODEL || process.env.SOCIAL_TEXT_MODEL || 'gpt-5.6-terra';
  const token = randomUUID();
  const claim = await prisma.$transaction(async tx => {
    const [row] = await tx.$queryRaw<Row[]>`SELECT k.revision, k.status, k.detailsCiphertext, k.reviewCiphertext, p.status AS businessStatus FROM procurement_partner_kyc k JOIN procurement_partners p ON p.id=k.partnerId WHERE k.partnerId=${id} FOR UPDATE`;
    if (!row) throw new ReviewError('Application not found.', 404);
    const details = decode(row.detailsCiphertext, id);
    const answers = readinessForAssessment(details.businessReadiness);
    if (!details.businessReadiness?.responsibilitiesAccepted || Object.values(answers).some(value => !value)) throw new ReviewError('Complete business-readiness answers are required before automatic scoring.', 422);
    const sourceHash = hashAnswers(answers, model);
    const review = decode(row.reviewCiphertext, id);
    const existing = review.automaticFit;
    if (existing?.sourceHash === sourceHash && existing.status === 'COMPLETE') return { result: existing.assessment };
    if (row.businessStatus !== 'PENDING' || !['SUBMITTED', 'VERIFIED'].includes(row.status)) throw new ReviewError('Automatic scoring is available for submitted applications awaiting a business decision.', 409);
    if (existing?.status === 'RUNNING' && Date.parse(existing.startedAt) > Date.now() - 90000) return { running: true };
    if (existing?.status === 'FAILED' && Date.parse(existing.failedAt) > Date.now() - 60000) throw new ReviewError('Automatic scoring is unavailable. Wait one minute before retrying, or continue the manual review.', 429);
    if (!process.env.OPENAI_API_KEY) throw new ReviewError('Automatic scoring is not configured in admin. You can still complete the manual review.', 503);
    review.automaticFit = { status: 'RUNNING', token, sourceHash, startedAt: new Date().toISOString() };
    await tx.$executeRaw`UPDATE procurement_partner_kyc SET reviewCiphertext=${encode(review, id)} WHERE partnerId=${id}`;
    return { answers, sourceHash, revision: row.revision };
  });
  if ('result' in claim) return { status: 'COMPLETE' as const, assessment: claim.result };
  if ('running' in claim) return { status: 'RUNNING' as const };
  try {
    // Do not hold a database transaction open during a provider request.
    const output = await generateFitAssessment(claim.answers, model);
    const assessment = { ...output, total: weightedFitScore(output.scores), sourceHash: claim.sourceHash, policyVersion: fitPolicyVersion, model, assessedAt: new Date().toISOString() };
    await prisma.$transaction(async tx => {
      const [row] = await tx.$queryRaw<Row[]>`SELECT k.revision, k.status, k.detailsCiphertext, k.reviewCiphertext, p.status AS businessStatus FROM procurement_partner_kyc k JOIN procurement_partners p ON p.id=k.partnerId WHERE k.partnerId=${id} FOR UPDATE`;
      if (!row) throw new ReviewError('Application no longer exists.', 409);
      const review = decode(row.reviewCiphertext, id);
      if (row.revision !== claim.revision || row.businessStatus !== 'PENDING' || !['SUBMITTED', 'VERIFIED'].includes(row.status) || review.automaticFit?.token !== token || hashAnswers(decode(row.detailsCiphertext, id).businessReadiness, model) !== claim.sourceHash) throw new ReviewError('The application changed during scoring. Reload the review.', 409);
      review.automaticFit = { status: 'COMPLETE', sourceHash: claim.sourceHash, assessment };
      await tx.$executeRaw`UPDATE procurement_partner_kyc SET reviewCiphertext=${encode(review, id)} WHERE partnerId=${id}`;
      await tx.$executeRaw`INSERT INTO procurement_partner_kyc_events (id, partnerId, actorPid, action, detailsCiphertext, createdAt, emailStatus) VALUES (${randomUUID()}, ${id}, ${actorPid}, 'BUSINESS_FIT_AUTOSCORED', ${encode(assessment, id)}, NOW(3), 'NONE')`;
    });
    return { status: 'COMPLETE' as const, assessment };
  } catch (error) {
    await prisma.$transaction(async tx => {
      const [row] = await tx.$queryRaw<Row[]>`SELECT reviewCiphertext FROM procurement_partner_kyc WHERE partnerId=${id} FOR UPDATE`;
      const review = decode(row?.reviewCiphertext || null, id);
      if (review.automaticFit?.token === token) {
        review.automaticFit = { status: 'FAILED', sourceHash: claim.sourceHash, failedAt: new Date().toISOString() };
        await tx.$executeRaw`UPDATE procurement_partner_kyc SET reviewCiphertext=${encode(review, id)} WHERE partnerId=${id}`;
      }
    });
    if (error instanceof ReviewError) throw error;
    throw new ReviewError('Automatic scoring is temporarily unavailable. Retry in one minute or complete the review manually.', 503);
  }
}
