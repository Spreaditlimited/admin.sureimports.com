const DEFAULT_CUSTOMER_INVOICE_BASE_URL = 'https://admin.sureimports.com';

function sanitizeBaseUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

export function getCustomerInvoiceBaseUrl(): string {
  return (
    sanitizeBaseUrl(process.env.CUSTOMER_INVOICE_BASE_URL) ||
    DEFAULT_CUSTOMER_INVOICE_BASE_URL
  );
}

