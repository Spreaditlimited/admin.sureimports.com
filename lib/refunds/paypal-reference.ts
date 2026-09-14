/** A refund resource ID is NOT a capture ID. Only extract IDs; never fetch supplied URLs. */
export function paypalCaptureReference(event: string, resource: any): string {
  const valid = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9]{5,80}$/.test(value) ? value : '';
  const related = valid(resource?.disputed_transactions?.[0]?.seller_transaction_id)
    || valid(resource?.supplementary_data?.related_ids?.capture_id);
  if (related) return related;
  if (event === 'PAYMENT.CAPTURE.REFUNDED') {
    const links = Array.isArray(resource?.links) ? resource.links : [];
    for (const link of links) {
      if (link?.rel !== 'up') continue;
      try {
        const url = new URL(link.href);
        if (url.protocol !== 'https:' || !['api.paypal.com', 'api-m.paypal.com', 'api.sandbox.paypal.com', 'api-m.sandbox.paypal.com'].includes(url.hostname)) continue;
        const match = url.pathname.match(/^\/v2\/payments\/captures\/([A-Za-z0-9]{5,80})$/);
        if (match) return match[1];
      } catch { /* malformed provider linkage must not be guessed */ }
    }
    return '';
  }
  return event.startsWith('PAYMENT.CAPTURE.') ? valid(resource?.id) : '';
}
