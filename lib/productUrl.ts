const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"']+/i;
const BARE_URL_PATTERN = /(?:www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z]{2,})+(?:\/[^\s<>"']*)?/i;

function removeShareMessagePunctuation(value: string): string {
  return value.replace(/[\])},.!;:]+$/g, '');
}

/** Extracts a safe web URL from a product URL or marketplace share message. */
export function normalizeProductUrl(value: string | null | undefined): string | null {
  const rawValue = (value || '').trim();
  if (!rawValue) return null;

  const httpMatch = rawValue.match(HTTP_URL_PATTERN);
  const bareMatch = httpMatch ? null : rawValue.match(BARE_URL_PATTERN);
  const matchedValue = httpMatch?.[0] || bareMatch?.[0];
  if (!matchedValue) return null;

  const candidate = removeShareMessagePunctuation(matchedValue);
  const urlValue = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    const url = new URL(urlValue);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
