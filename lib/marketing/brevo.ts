import { normalizeMarketingRecipient } from './config';
import { renderMarketingEmail } from './content';
import { brevoRequest, getBrevoConfig, getBrevoContact, isBrevoContactBlocked } from './brevoClient';
import type { MarketingEmailInput, MarketingSendResult } from './types';
import { prisma } from '@/lib/prisma';
import { hasConfirmedMarketingConsent } from './brevoConsent';

export async function sendBrevoMarketingEmail(input: MarketingEmailInput): Promise<MarketingSendResult> {
  const config = getBrevoConfig();
  const recipientEmail = normalizeMarketingRecipient(input.recipientEmail);
  const contact = await getBrevoContact(recipientEmail);
  if (contact && isBrevoContactBlocked(contact)) throw new Error('Brevo has suppressed this recipient.');
  const local = await prisma.marketing_contacts.findUnique({ where: { email: recipientEmail } });
  const internalTest = input.testOnly && local?.status === 'ACTIVE' && local.consentStatus === 'TEST_ONLY';
  if (!internalTest && !hasConfirmedMarketingConsent(local)) throw new Error('Marketing consent is not active.');
  if (!internalTest && !input.unsubscribeUrl) throw new Error('Marketing email requires an unsubscribe link.');
  const rendered = renderMarketingEmail({ ...input, includeManagedUnsubscribe: Boolean(input.unsubscribeUrl) });
  const headers: Record<string, string> = {};
  if (input.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${input.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  if (input.tags?.delivery) headers['X-SureImports-Delivery'] = input.tags.delivery;
  const result = await brevoRequest<{ messageId: string }>('/smtp/email', 'POST', {
    sender: { email: config.email, name: config.name },
    replyTo: { email: config.replyTo, name: config.name },
    to: [{ email: recipientEmail, ...(input.firstName ? { name: input.firstName } : {}) }],
    subject: input.subject, htmlContent: rendered.html, textContent: rendered.text,
    headers,
    tags: ['sureimports-marketing', ...Object.entries(input.tags || {}).map(([key, value]) => `${key}:${value}`)].slice(0, 10),
  });
  if (!result.messageId) throw new Error('Brevo did not return a message ID.');
  return { messageId: result.messageId, recipientEmail, provider: 'brevo', mode: 'production' };
}
