export const MARKETING_AWS_REGION = process.env.MARKETING_AWS_REGION || 'eu-west-1';
export const MARKETING_CONFIGURATION_SET =
  process.env.SES_MARKETING_CONFIGURATION_SET || 'sureimports-marketing';
export const MARKETING_CONTACT_LIST =
  process.env.SES_MARKETING_CONTACT_LIST || 'sureimports-marketing';
export const MARKETING_DEFAULT_TOPIC =
  process.env.SES_MARKETING_DEFAULT_TOPIC || 'general-insights';
export const MARKETING_FROM_EMAIL =
  process.env.SES_MARKETING_FROM_EMAIL || 'hello@mail.sureimports.com';
export const MARKETING_REPLY_TO =
  process.env.SES_MARKETING_REPLY_TO || 'hello@sureimports.com';
export const MARKETING_FROM_NAME = process.env.SES_MARKETING_FROM_NAME || 'Sure Imports';

export type MarketingSendMode = 'sandbox' | 'production';

export function getMarketingSendMode(): MarketingSendMode {
  return process.env.SES_MARKETING_MODE?.toLowerCase() === 'production' &&
    process.env.SES_PRODUCTION_SENDS_ENABLED === 'true'
    ? 'production'
    : 'sandbox';
}

export function getSandboxAllowedRecipients() {
  return new Set(
    (process.env.SES_SANDBOX_ALLOWED_RECIPIENTS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const SES_MARKETING_CUTOVER_AT = new Date(
  process.env.SES_MARKETING_CUTOVER_AT || '2026-08-13T23:00:00.000Z',
);

export function isMailboxSimulatorAddress(email: string) {
  return email.toLowerCase().endsWith('@simulator.amazonses.com');
}

export function normalizeMarketingRecipient(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error('A recipient email is required.');
  return normalized;
}
