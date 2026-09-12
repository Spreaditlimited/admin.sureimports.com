import { z } from 'zod';

// Enable only after deployed admission/import/email-change paths are verified.
export const PARTNER_ACTIVATION_ROLLOUT_READY = false;
export const activationSchema = z.object({
  revision: z.number().int().nonnegative(),
  agreementReference: z.string().trim().min(5).max(500),
  agreementReviewed: z.literal(true),
}).strict();

export function activationBlockReason(input: { kycStatus: string; businessStatus: string; country: string; currency: string }, rolloutReady: boolean) {
  if (!rolloutReady) return 'Membership protection must be deployed and verified before activation.';
  if (input.businessStatus !== 'PENDING') return 'Only pending businesses can be activated.';
  if (input.kycStatus !== 'VERIFIED') return 'KYC evidence must be accepted first.';
  if (input.country !== 'NG' || input.currency !== 'NGN') return 'Only Nigerian businesses settling in NGN are supported.';
  return null;
}
