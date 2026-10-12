import { getMarketingProvider } from './config';
import { sendHostingerMarketingEmail } from './hostinger';
import { sendSesMarketingEmail } from './ses';
import { sendBrevoMarketingEmail } from './brevo';
import type { MarketingEmailInput, MarketingSendResult } from './types';

export async function sendMarketingEmail(
  input: MarketingEmailInput,
): Promise<MarketingSendResult> {
  if (getMarketingProvider() === 'brevo') return sendBrevoMarketingEmail(input);
  return getMarketingProvider() === 'hostinger'
    ? sendHostingerMarketingEmail(input)
    : sendSesMarketingEmail(input);
}
