import { getMarketingProvider } from './config';
import { sendHostingerMarketingEmail } from './hostinger';
import { sendSesMarketingEmail } from './ses';
import type { MarketingEmailInput, MarketingSendResult } from './types';

export async function sendMarketingEmail(
  input: MarketingEmailInput,
): Promise<MarketingSendResult> {
  return getMarketingProvider() === 'hostinger'
    ? sendHostingerMarketingEmail(input)
    : sendSesMarketingEmail(input);
}
