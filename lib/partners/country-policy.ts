import { z } from 'zod';

/** Configured country policies are versioned; provider support is not inferred from a currency code. */
export const countryPolicySchema = z.object({
  code: z.string().regex(/^[A-Z]{2}$/, 'Use a two-letter country code, for example GB.'),
  name: z.string().trim().min(2).max(80),
  status: z.enum(['DRAFT', 'OPEN', 'PAUSED']),
  verificationProfile: z.enum(['NG_BUSINESS', 'UK_STANDARD']),
  allowIndividuals: z.boolean(),
  allowCompanies: z.boolean(),
  billingCurrency: z.string().regex(/^[A-Z]{3}$/),
  settlementCurrency: z.string().regex(/^[A-Z]{3}$/),
  monthlyFeeMinor: z.number().int().min(0).max(100000000),
  trialDays: z.number().int().min(0).max(365),
  minimumAge: z.number().int().min(18).max(100),
  addressEvidenceMonths: z.number().int().min(1).max(6),
  requireIdentityMeeting: z.boolean(),
  requireOwnNamePayout: z.boolean(),
  extraDocuments: z.array(z.object({ key:z.string().regex(/^[A-Z][A-Z0-9_]{2,39}$/), label:z.string().trim().min(5).max(160) }).strict()).max(10),
  revision: z.number().int().min(0),
}).strict().superRefine((value,ctx)=>{
  const issue = (field:string,message:string)=>ctx.addIssue({code:'custom',path:[field],message});
  if (!value.allowIndividuals && !value.allowCompanies) issue('allowCompanies','Enable at least one applicant type.');
  if (value.verificationProfile === 'NG_BUSINESS' && value.allowIndividuals) issue('allowIndividuals','The Nigerian business verification profile requires a registered business.');
  if (value.code === 'NG' && (value.verificationProfile !== 'NG_BUSINESS' || value.billingCurrency !== 'NGN' || value.settlementCurrency !== 'NGN')) issue('verificationProfile','Nigeria uses Nigerian business verification, NGN billing and NGN payouts.');
  if (value.code === 'GB' && (value.verificationProfile !== 'UK_STANDARD' || value.billingCurrency !== 'GBP' || value.settlementCurrency !== 'GBP')) issue('billingCurrency','The UK uses UK verification, GBP billing and GBP payouts.');
  if (value.verificationProfile === 'UK_STANDARD' && (!value.requireIdentityMeeting || !value.requireOwnNamePayout || value.addressEvidenceMonths > 3)) issue('verificationProfile','UK verification requires a manual identity check, own-name payout verification and address evidence within three months.');
  if (new Set(value.extraDocuments.map(d=>d.key)).size !== value.extraDocuments.length) issue('extraDocuments','Document keys must be unique.');
  if (value.status === 'OPEN' && !['NG_BUSINESS','UK_STANDARD'].includes(value.verificationProfile)) issue('status','A supported verification profile is required.');
});
export type CountryPolicy = z.infer<typeof countryPolicySchema>;
export function parseStoredCountryPolicy(value: unknown): CountryPolicy {
  const stored = value as Record<string, unknown>;
  return countryPolicySchema.parse({ ...stored, settlementCurrency: stored.settlementCurrency ?? (stored.code === 'NG' ? 'NGN' : stored.code === 'GB' ? 'GBP' : undefined) });
}
export function permittedApplicantTypes(policy: CountryPolicy) {
  return policy.verificationProfile === 'NG_BUSINESS'
    ? policy.allowCompanies ? ['BUSINESS_NAME','PRIVATE_COMPANY'] : []
    : [...(policy.allowIndividuals ? ['UK_INDIVIDUAL'] : []), ...(policy.allowCompanies ? ['UK_COMPANY'] : [])];
}
