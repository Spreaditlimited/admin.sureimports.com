export const SHIPPING_ONLY_LINK_PREFIX = 'shipping-only:';

export type InvoiceLinkedService =
  | { type: 'shipping-only'; id: string }
  | { type: 'corporate-gift'; id: string }
  | { type: 'none'; id: '' };

export function encodeShippingOnlyLinkedRequestId(pidShippingOnly: string): string {
  return `${SHIPPING_ONLY_LINK_PREFIX}${String(pidShippingOnly || '').trim()}`;
}

export function parseInvoiceLinkedRequestId(linkedRequestId: unknown): InvoiceLinkedService {
  const raw = String(linkedRequestId || '').trim();
  if (!raw) return { type: 'none', id: '' };

  if (raw.startsWith(SHIPPING_ONLY_LINK_PREFIX)) {
    const id = raw.slice(SHIPPING_ONLY_LINK_PREFIX.length).trim();
    return id ? { type: 'shipping-only', id } : { type: 'none', id: '' };
  }

  return { type: 'corporate-gift', id: raw };
}
