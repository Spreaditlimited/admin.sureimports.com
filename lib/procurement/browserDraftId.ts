/** Local draft identifiers, not authentication tokens. Works on HTTP previews too. */
export function createBrowserDraftId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }
  // Older embedded browsers may not expose Web Crypto at all.
  return `${Date.now().toString(36)}-${Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join('')}`;
}
