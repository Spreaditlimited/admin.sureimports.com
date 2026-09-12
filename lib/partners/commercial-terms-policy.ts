import { z } from 'zod';
export const commercialTermsSchema = z.object({
  pricingRevision: z.number().int().nonnegative(),
  serviceChargeBps: z.number().int().min(0).max(10000),
  partnerShareBps: z.number().int().min(0).max(10000),
  reason: z.string().trim().min(5).max(1000),
  confirmed: z.literal(true),
}).strict().refine(v => v.partnerShareBps <= v.serviceChargeBps, { message: 'Partner share cannot exceed the customer service charge.', path: ['partnerShareBps'] });

export function percentageToBps(value: string) {
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const bps = Math.round(Number(value) * 100);
  return bps <= 10000 ? bps : null;
}
