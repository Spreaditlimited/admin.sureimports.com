export type InvoiceCustomerIdentity = {
  businessName: string | null;
  contactName: string | null;
  billedToName: string;
};

function clean(value: unknown) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export function resolveInvoiceCustomerIdentity(
  invoice: {
    customerName?: unknown;
    customerBusinessName?: unknown;
    customerContactName?: unknown;
  },
  profileBusinessName?: unknown,
): InvoiceCustomerIdentity {
  const businessName = clean(invoice.customerBusinessName) || clean(profileBusinessName);
  let contactName = clean(invoice.customerContactName) || clean(invoice.customerName);

  // Older invoices stored values such as "Chioma Eziokwu (Cafe One)".
  if (contactName && businessName) {
    const suffix = `(${businessName})`;
    if (contactName.endsWith(suffix)) {
      contactName = clean(contactName.slice(0, -suffix.length));
    }
  }

  return {
    businessName,
    contactName,
    billedToName: businessName || contactName || 'Customer',
  };
}

