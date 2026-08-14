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
  previewText?: string | null;
  bodyText: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  firstName?: string | null;
  includeManagedUnsubscribe?: boolean;
}) {
  const bodyText = personalizeMarketingText(input.bodyText, input);
  const previewText = personalizeMarketingText(input.previewText || '', input);
  const cta = input.ctaLabel && input.ctaUrl
    ? `<p style="margin:28px 0"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">${escapeHtml(input.ctaLabel)}</a></p>`
    : '';
  const unsubscribe = input.includeManagedUnsubscribe
    ? `<p style="margin:26px 0 0;font-size:12px;color:#64748b">You are receiving this because you subscribed to Sure Imports insights. <a href="{{amazonSESUnsubscribeUrl}}" style="color:#475569">Manage preferences or unsubscribe</a>.</p>`
    : '';

  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(previewText)}</div><div style="max-width:640px;margin:0 auto;padding:28px 18px"><div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:32px"><div style="font-size:18px;font-weight:800;margin-bottom:26px">Sure Imports</div>${marketingTextToHtml(bodyText)}${cta}<p style="margin:28px 0 0">Tochukwu Nkwocha<br><span style="color:#64748b">Sure Imports</span></p>${unsubscribe}</div></div></body></html>`;

  const text = [
    bodyText,
    input.ctaLabel && input.ctaUrl ? `${input.ctaLabel}: ${input.ctaUrl}` : '',
    'Tochukwu Nkwocha\nSure Imports',
    input.includeManagedUnsubscribe
      ? 'Manage preferences or unsubscribe: {{amazonSESUnsubscribeUrl}}'
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { html, text };
}

