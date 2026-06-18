export const SHIPPING_ONLY_STATUSES = [
  'request-received',
  'product-shipped',
  'product-arrived',
  'invoiced',
  'paid',
  'product-delivered',
  'request-cancelled',
] as const;

export type ShippingOnlyStatus = (typeof SHIPPING_ONLY_STATUSES)[number];

const SHIPPING_ONLY_STATUS_SET = new Set<string>(SHIPPING_ONLY_STATUSES);

const LEGACY_TO_CANONICAL: Record<string, ShippingOnlyStatus> = {
  saved: 'request-received',
  'request received': 'request-received',
  pending: 'product-shipped',
  'ready to ship': 'product-shipped',
  'ready-to-ship': 'product-shipped',
  approved: 'product-shipped',
  'product shipped': 'product-shipped',
  shipped: 'product-shipped',
  'pay-for-shipping': 'product-arrived',
  'product arrived': 'product-arrived',
  arrived: 'product-arrived',
  invoiced: 'invoiced',
  paid: 'paid',
  'in-transit': 'product-delivered',
  'product delivered': 'product-delivered',
  completed: 'product-delivered',
  'ready-for-pickup': 'product-delivered',
  cancelled: 'request-cancelled',
  'request cancelled': 'request-cancelled',
};

const NIGERIA_APPROVE_TRANSITIONS: Record<ShippingOnlyStatus, ShippingOnlyStatus> = {
  'request-received': 'product-shipped',
  'product-shipped': 'product-arrived',
  'product-arrived': 'invoiced',
  invoiced: 'paid',
  paid: 'product-delivered',
  'product-delivered': 'product-delivered',
  'request-cancelled': 'request-received',
};

const INTERNATIONAL_APPROVE_TRANSITIONS: Record<ShippingOnlyStatus, ShippingOnlyStatus> = {
  'request-received': 'invoiced',
  invoiced: 'paid',
  paid: 'product-shipped',
  'product-shipped': 'product-arrived',
  'product-arrived': 'product-delivered',
  'product-delivered': 'product-delivered',
  'request-cancelled': 'request-received',
};

export function normalizeShippingOnlyStatus(value: unknown): string {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (SHIPPING_ONLY_STATUS_SET.has(normalized)) return normalized;
  return LEGACY_TO_CANONICAL[normalized] || normalized;
}

export function isShippingOnlyStatus(value: unknown): value is ShippingOnlyStatus {
  return SHIPPING_ONLY_STATUS_SET.has(String(value || ''));
}

export function getShippingOnlyNextStatus(
  currentStatus: unknown,
  action: 'approve' | 'decline',
  isInternational = false,
): ShippingOnlyStatus | null {
  if (action === 'decline') return 'request-cancelled';

  const normalizedCurrent = normalizeShippingOnlyStatus(currentStatus);
  if (!isShippingOnlyStatus(normalizedCurrent)) return null;
  return (isInternational ? INTERNATIONAL_APPROVE_TRANSITIONS : NIGERIA_APPROVE_TRANSITIONS)[normalizedCurrent];
}

export function getShippingOnlyStatusVariantsForFilter(status: unknown): string[] {
  const normalized = normalizeShippingOnlyStatus(status);
  if (!isShippingOnlyStatus(normalized)) return [];

  const variants = new Set<string>([normalized]);
  for (const [legacy, canonical] of Object.entries(LEGACY_TO_CANONICAL)) {
    if (canonical === normalized) variants.add(legacy);
  }
  return Array.from(variants);
}

export function getShippingOnlyStatusLabel(status: unknown): string {
  const normalized = normalizeShippingOnlyStatus(status);
  const labels: Record<ShippingOnlyStatus, string> = {
    'request-received': 'Request Received',
    'product-shipped': 'Shipped',
    'product-arrived': 'Arrived',
    invoiced: 'Invoiced',
    paid: 'Paid',
    'product-delivered': 'Completed',
    'request-cancelled': 'Request Cancelled',
  };
  return isShippingOnlyStatus(normalized) ? labels[normalized] : String(status || '').replace(/-/g, ' ');
}
