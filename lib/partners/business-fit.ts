import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { encryptKyc, decryptKyc } from './kyc-crypto';
import { ReviewError } from './review';
import { fitScoresSchema, weightedFitScore } from './business-fit-policy';

export const fitSchema = z.object({
  revision: z.number().int().nonnegative(),
  decision: z.enum(['PILOT_APPROVED', 'REQUEST_CHANGES', 'NOT_READY']),
  scores: fitScoresSchema,
  evidence: z.string().trim().min(20).max(2000),
  concerns: z.string().trim().min(5).max(2000),
  message: z.string().trim().min(20).max(2000),
  hardBlockersCleared: z.boolean(),
  overrideReason: z.string().trim().max(1000),
  pilotDays: z.number().int().min(30).max(60),
  pilotTargets: z.string().trim().max(2000),
}).strict();
export function fitScore(scores: z.infer<typeof fitSchema>['scores']) {
  return weightedFitScore(scores);
}
export async function decideBusinessFit(id: string, actorPid: string, input: unknown) {
  const parsed = fitSchema.safeParse(input);
  if (!parsed.success) throw new ReviewError('Complete all scorecard fields, a decision reason and a valid 30–60 day pilot duration.', 422);
  const body = parsed.data; const total = fitScore(body.scores);
  const notificationId = randomUUID();
  if (body.decision === 'PILOT_APPROVED' && (!body.hardBlockersCleared || body.pilotTargets.length < 30 || (total < 75 && body.overrideReason.length < 30)))
    throw new ReviewError('Pilot approval requires cleared hard blockers, measurable targets and a reason for overriding a score below 75.', 422);
  await prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{ revision: number; status: string; detailsCiphertext: string | null; reviewCiphertext: string | null; businessStatus: string }>>`SELECT k.revision, k.status, k.detailsCiphertext, k.reviewCiphertext, p.status AS businessStatus FROM procurement_partner_kyc k JOIN procurement_partners p ON p.id=k.partnerId WHERE k.partnerId=${id} FOR UPDATE`;
    const row = rows[0];
    if (!row) throw new ReviewError('Application not found.', 404);
    if (row.revision !== body.revision || row.businessStatus !== 'PENDING' || !['SUBMITTED', 'VERIFIED'].includes(row.status)) throw new ReviewError('Application changed or is not awaiting review. Reload it.', 409);
    const decode = (value: string | null) => value ? JSON.parse(decryptKyc(Buffer.from(value, 'base64'), id).toString('utf8')) : {};
    const details = decode(row.detailsCiphertext);
    if (!details.businessReadiness?.responsibilitiesAccepted) throw new ReviewError('The applicant must complete business-readiness answers first.', 422);
    const automatic = decode(row.reviewCiphertext).automaticFit;
    const note = { ...body, total, actorPid, reviewedAt: new Date().toISOString(), policyVersion: '2026-09-12', automaticAssessment: automatic?.status === 'COMPLETE' ? automatic.assessment : null };
    const correction = body.decision === 'REQUEST_CHANGES' ? { decision: 'REQUEST_CHANGES', message: body.message, reviewedAt: note.reviewedAt, actorPid, evidenceReference: '' } : {};
    const encrypted = encryptKyc(Buffer.from(JSON.stringify({ ...decode(row.reviewCiphertext), ...correction, businessFit: note })), id).toString('base64');
    const audit = encryptKyc(Buffer.from(JSON.stringify(note)), id).toString('base64');
    const status = body.decision === 'REQUEST_CHANGES' ? 'DRAFT' : row.status;
    await tx.$executeRaw`UPDATE procurement_partner_kyc SET reviewCiphertext=${encrypted}, status=${status}, revision=revision+1, updatedAt=NOW(3) WHERE partnerId=${id}`;
    await tx.$executeRaw`INSERT INTO procurement_partner_kyc_events (id, partnerId, actorPid, action, detailsCiphertext, createdAt, emailStatus) VALUES (${randomUUID()}, ${id}, ${actorPid}, 'BUSINESS_FIT_REVIEWED', ${audit}, NOW(3), 'NONE')`;
    const notificationAction = { PILOT_APPROVED: 'BUSINESS_FIT_APPROVED', REQUEST_CHANGES: 'BUSINESS_FIT_CHANGES', NOT_READY: 'BUSINESS_FIT_NOT_READY' }[body.decision];
    await tx.$executeRaw`INSERT INTO procurement_partner_kyc_events (id, partnerId, actorPid, action, createdAt, emailStatus) VALUES (${notificationId}, ${id}, ${actorPid}, ${notificationAction}, NOW(3), 'QUEUED')`;
  });
  return { decision: body.decision, notificationId };
}
