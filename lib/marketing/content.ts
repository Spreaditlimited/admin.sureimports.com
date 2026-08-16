import mailTemplate from '../email/temp/mailTemplate2';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function personalizeMarketingText(
  text: string,
  input: { firstName?: string | null },
) {
  return text.replace(/\{\{firstName\}\}/g, input.firstName?.trim() || 'there');
}

export function marketingTextToHtml(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => `<p style="margin:0 0 18px;line-height:1.7">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function renderMarketingEmail(input: {
  subject: string;
  bodyTitle?: string | null;
  previewText?: string | null;
  bodyText: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  firstName?: string | null;
  includeManagedUnsubscribe?: boolean;
  unsubscribeUrl?: string | null;
}) {
  const bodyText = personalizeMarketingText(input.bodyText, input);
  const previewText = personalizeMarketingText(input.previewText || '', input);
  const unsubscribeUrl = input.unsubscribeUrl || '{{amazonSESUnsubscribeUrl}}';
  const unsubscribe = input.includeManagedUnsubscribe
    ? `<p style="margin:26px 0 0;font-size:12px;color:#64748b">You are receiving this because you subscribed to Sure Imports insights. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#475569">Unsubscribe from these emails</a>.</p>`
    : '';
  const signature =
    '<p style="margin:28px 0 0">Tochukwu Nkwocha<br><span style="color:#64748b">Sure Imports</span></p>';

  const standardHtml = mailTemplate({
    zTitle: escapeHtml(input.subject),
    zBodyTitle: escapeHtml(input.bodyTitle || input.subject),
    zBody1: marketingTextToHtml(bodyText),
    zBody2: `${signature}${unsubscribe}`,
    zButtonTitle: input.ctaLabel ? escapeHtml(input.ctaLabel) : '',
    zButtonLink: input.ctaUrl ? escapeHtml(input.ctaUrl) : '',
    zButtonStyle:
      'display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:14px 24px;border:1px solid #ea580c;border-bottom:4px solid #c2410c;border-radius:10px;font-size:14px;line-height:1.2;font-weight:800;letter-spacing:.01em;box-shadow:0 8px 18px rgba(194,65,12,.22);',
  }) as string;

  const html = previewText
    ? standardHtml.replace(
        /(<body[^>]*>)/i,
        `$1<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(previewText)}</div>`,
      )
    : standardHtml;

  const text = [
    bodyText,
    input.ctaLabel && input.ctaUrl ? `${input.ctaLabel}: ${input.ctaUrl}` : '',
    'Tochukwu Nkwocha\nSure Imports',
    input.includeManagedUnsubscribe
      ? `Unsubscribe from these emails: ${unsubscribeUrl}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { html, text };
}
