import { z } from 'zod';

// Affiliate signup reserves membership transactionally (deployed in c8a528b).
// Activation still checks KYC, business fit, agreement, country, membership and
// existing affiliate accounts under row locks. This flag is not a bypass.
export const PARTNER_ACTIVATION_ROLLOUT_READY = true;
export const activationSchema = z.object({
  revision: z.number().int().nonnegative(),
  agreementReference: z.string().trim().regex(/^AGR-[a-f0-9-]{36}$/i, 'The business must accept the current agreement first.'),
  agreementReviewed: z.literal(true),
}).strict();

export function activationBlockReason(input: { kycStatus: string; businessStatus: string; country: string; currency: string }, rolloutReady: boolean) {
  if (!rolloutReady) return 'Membership protection must be deployed and verified before activation.';
  if (input.businessStatus !== 'PENDING') return 'Only pending businesses can be activated.';
  if (input.kycStatus !== 'VERIFIED') return 'KYC evidence must be accepted first.';
  if (input.country !== 'NG' || input.currency !== 'NGN') return 'Only Nigerian businesses settling in NGN are supported.';
  return null;
}
