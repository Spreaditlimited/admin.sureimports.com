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

export type MarketingProvider = 'hostinger' | 'ses';

function hasHostingerMarketingConfig() {
  return Boolean(
    process.env.MARKETING_SMTP_HOST?.trim() &&
      process.env.MARKETING_SMTP_PORT?.trim() &&
      process.env.MARKETING_SMTP_EMAIL?.trim() &&
      process.env.MARKETING_SMTP_PASSWORD,
  );
}

export function getMarketingProvider(): MarketingProvider {
  const configured = process.env.MARKETING_EMAIL_PROVIDER?.trim().toLowerCase();
  if (configured === 'ses') return 'ses';
  if (configured === 'hostinger') {
    if (!hasHostingerMarketingConfig()) {
      throw new Error('Hostinger marketing email is selected but its SMTP configuration is incomplete.');
    }
    return 'hostinger';
  }
  return hasHostingerMarketingConfig() ? 'hostinger' : 'ses';
}

export function getMarketingProviderLabel() {
  return getMarketingProvider() === 'hostinger' ? 'Hostinger SMTP' : 'Amazon SES';
}

export function getMarketingDailySendLimit() {
  const parsed = Number.parseInt(process.env.MARKETING_DAILY_SEND_LIMIT || '500', 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1_000) : 500;
}

export function getMarketingBatchSize() {
  const parsed = Number.parseInt(process.env.MARKETING_SEND_BATCH_SIZE || '10', 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : 10;
}

export function getMarketingPublicUrl() {
  return (
    process.env.NEXT_PUBLIC_MAIN_SITE_URL ||
    process.env.SUREIMPORTS_SITE_URL ||
    'https://www.sureimports.com'
  ).replace(/\/$/, '');
}

export function getHostingerMarketingConfig() {
  if (!hasHostingerMarketingConfig()) {
    throw new Error('Hostinger marketing SMTP configuration is incomplete.');
  }
  const port = Number.parseInt(process.env.MARKETING_SMTP_PORT || '', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('MARKETING_SMTP_PORT must be a valid port number.');
  }
  return {
    host: process.env.MARKETING_SMTP_HOST!.trim(),
    port,
    secure: process.env.MARKETING_SMTP_SECURE?.trim().toLowerCase() === 'true',
    email: process.env.MARKETING_SMTP_EMAIL!.trim().toLowerCase(),
    password: process.env.MARKETING_SMTP_PASSWORD!,
    fromName: process.env.MARKETING_FROM_NAME?.trim() || 'Sure Imports Insights',
    replyTo:
      process.env.MARKETING_REPLY_TO?.trim().toLowerCase() ||
      process.env.MARKETING_SMTP_EMAIL!.trim().toLowerCase(),
  };
}

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

export function isFiveDaySandboxTestEnabled() {
  return (
    getMarketingSendMode() === 'sandbox' &&
    process.env.SES_SANDBOX_FIVE_DAY_TEST_ENABLED === 'true'
  );
}

export function getSandboxTestFirstName() {
  return process.env.SES_SANDBOX_TEST_FIRST_NAME?.trim() || 'Tochukwu';
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
