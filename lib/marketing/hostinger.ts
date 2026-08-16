import nodemailer, { type Transporter } from 'nodemailer';

import { getHostingerMarketingConfig, normalizeMarketingRecipient } from './config';
import { renderMarketingEmail } from './content';
import type { MarketingEmailInput, MarketingSendResult } from './types';

let transporter: Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const config = getHostingerMarketingConfig();
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.email, pass: config.password },
    tls: { minVersion: 'TLSv1.2' },
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  return transporter;
}

export async function verifyHostingerMarketingTransport() {
  await getTransporter().verify();
  return true;
}

export async function sendHostingerMarketingEmail(
  input: MarketingEmailInput,
): Promise<MarketingSendResult> {
  const recipientEmail = normalizeMarketingRecipient(input.recipientEmail);
  const config = getHostingerMarketingConfig();
  const rendered = renderMarketingEmail({
    ...input,
    includeManagedUnsubscribe: Boolean(input.unsubscribeUrl),
    unsubscribeUrl: input.unsubscribeUrl,
  });
  const headers: Record<string, string> = {};
  if (input.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${input.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  if (input.tags?.delivery) headers['X-SureImports-Delivery'] = input.tags.delivery;

  const result = await getTransporter().sendMail({
    from: `"${config.fromName.replace(/[\r\n"\\]/g, '')}" <${config.email}>`,
    replyTo: config.replyTo,
    to: recipientEmail,
    subject: input.subject,
    text: rendered.text,
    html: rendered.html,
    headers,
  });
  if (!result.messageId) throw new Error('Hostinger SMTP did not return a message ID.');

  return {
    messageId: result.messageId,
    recipientEmail,
    provider: 'hostinger',
    mode: 'production',
  };
}
