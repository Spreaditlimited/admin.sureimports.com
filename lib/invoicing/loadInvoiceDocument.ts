import { prisma } from '@/lib/prisma';
import { getUserBusinessName } from '@/lib/userBusinessName';
import { resolveInvoiceCustomerIdentity } from './invoiceCustomer';

export async function loadInvoiceDocument(pidInvoice: string) {
  const invoice = await prisma.invoices.findUnique({
    where: { pidInvoice },
    include: {
      items: { orderBy: { lineNo: 'asc' } },
      user: {
        select: {
          userFirstname: true,
          userLastname: true,
          userEmail: true,
          userPhone: true,
          phone: true,
          address: true,
          userShippingAddress: true,
          userShippingAddress2: true,
          userState: true,
          userCountry: true,
          country: true,
        },
      },
    },
  });

  if (!invoice) return null;

  const profileBusinessName = await getUserBusinessName(invoice.pidUser);
  const identity = resolveInvoiceCustomerIdentity(invoice, profileBusinessName);
  const profileContactName = `${invoice.user.userFirstname || ''} ${invoice.user.userLastname || ''}`.trim();
  const profileAddress = [
    invoice.user.address || invoice.user.userShippingAddress,
    invoice.user.userShippingAddress2,
    invoice.user.userState,
    invoice.user.userCountry || invoice.user.country,
  ].filter(Boolean).join(', ');

  const documentInvoice = {
    ...invoice,
    customerName: identity.billedToName,
    customerBusinessName: identity.businessName,
    customerContactName: identity.contactName || profileContactName || null,
    customerEmail: invoice.customerEmail || invoice.user.userEmail || null,
    customerPhone: invoice.customerPhone || invoice.user.userPhone || invoice.user.phone || null,
    customerAddress: invoice.customerAddress || profileAddress || null,
  };

  const bankAccounts = await prisma.invoice_bank_accounts.findMany({
    where: {
      status: 'ACTIVE',
      currency: invoice.currency,
    },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      accountName: true,
      accountNumber: true,
      bankName: true,
      sortCode: true,
      currency: true,
      country: true,
      notes: true,
    },
  });

  return { invoice: documentInvoice, bankAccounts };
}

