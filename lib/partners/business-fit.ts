import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { encryptKyc, decryptKyc } from './kyc-crypto';
import { ReviewError } from './review';

const score = z.number().int().min(0).max(5);
export const fitSchema = z.object({
  revision: z.number().int().nonnegative(),
  decision: z.enum(['PILOT_APPROVED', 'REQUEST_CHANGES', 'NOT_READY']),
  scores: z.object({ audience: score, acquisition: score, operations: score, demand: score, understanding: score }).strict(),
  evidence: z.string().trim().min(20).max(2000),
  concerns: z.string().trim().min(5).max(2000),
  message: z.string().trim().min(20).max(2000),
  hardBlockersCleared: z.boolean(),
  overrideReason: z.string().trim().max(1000),
  pilotDays: z.number().int().min(30).max(60),
  pilotTargets: z.string().trim().max(2000),
}).strict();
export function fitScore(scores: z.infer<typeof fitSchema>['scores']) {
  return scores.audience * 6 + scores.acquisition * 5 + scores.operations * 5 + scores.demand * 2 + scores.understanding * 2;
}
export async function decideBusinessFit(id: string, actorPid: string, input: unknown) {
  const parsed = fitSchema.safeParse(input);
  if (!parsed.success) throw new ReviewError('Complete all scorecard fields, a decision reason and a valid 30–60 day pilot duration.', 422);
  const body = parsed.data; const total = fitScore(body.scores);
  if (body.decision === 'PILOT_APPROVED' && (!body.hardBlockersCleared || body.pilotTargets.length < 30 || (total < 75 && body.overrideReason.length < 30)))
    throw new ReviewError('Pilot approval requires cleared hard blockers, measurable targets and a reason for overriding a score below 75.', 422);
  await prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{ revision: number; detailsCiphertext: string | null; reviewCiphertext: string | null; businessStatus: string }>>`SELECT k.revision, k.detailsCiphertext, k.reviewCiphertext, p.status AS businessStatus FROM procurement_partner_kyc k JOIN procurement_partners p ON p.id=k.partnerId WHERE k.partnerId=${id} FOR UPDATE`;
    const row = rows[0];
    if (!row) throw new ReviewError('Application not found.', 404);
    if (row.revision !== body.revision || row.businessStatus !== 'PENDING') throw new ReviewError('Application changed or is no longer pending. Reload it.', 409);
    const decode = (value: string | null) => value ? JSON.parse(decryptKyc(Buffer.from(value, 'base64'), id).toString('utf8')) : {};
    const details = decode(row.detailsCiphertext);
    if (!details.businessReadiness?.responsibilitiesAccepted) throw new ReviewError('The applicant must complete business-readiness answers first.', 422);
    const note = { ...body, total, actorPid, reviewedAt: new Date().toISOString(), policyVersion: '2026-09-12' };
    const encrypted = encryptKyc(Buffer.from(JSON.stringify({ ...decode(row.reviewCiphertext), businessFit: note })), id).toString('base64');
    const audit = encryptKyc(Buffer.from(JSON.stringify(note)), id).toString('base64');
    await tx.$executeRaw`UPDATE procurement_partner_kyc SET reviewCiphertext=${encrypted}, revision=revision+1, updatedAt=NOW(3) WHERE partnerId=${id}`;
    await tx.$executeRaw`INSERT INTO procurement_partner_kyc_events (id, partnerId, actorPid, action, detailsCiphertext, createdAt, emailStatus) VALUES (${randomUUID()}, ${id}, ${actorPid}, 'BUSINESS_FIT_REVIEWED', ${audit}, NOW(3), 'NONE')`;
  });
}
