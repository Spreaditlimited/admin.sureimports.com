import { prisma } from '@/lib/prisma';
import { invoicePayPalEnvironment } from './paypalClient';
import { confirmInvoicePayPalCheckout } from './paypalCheckout';
import { notifyInvoicePayPalPayment } from './paypalNotifications';

export async function reconcileInvoicePayPalPayments() {
  const environment = invoicePayPalEnvironment();
  const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM paypal_invoice_checkouts
    WHERE environment = ${environment} AND status IN ('PENDING', 'PAID') AND providerReference IS NOT NULL
      AND createdAt > DATE_SUB(NOW(), INTERVAL 30 DAY)
    ORDER BY lastCheckedAt ASC LIMIT 10`;
  for (const row of rows) {
    try {
      await prisma.$executeRaw`UPDATE paypal_invoice_checkouts SET lastCheckedAt = NOW(3) WHERE id = ${row.id}`;
      const result = await confirmInvoicePayPalCheckout(row.id);
      if (result.status === 'PAID') await notifyInvoicePayPalPayment(row.id);
    } catch { console.warn('Invoice PayPal reconciliation deferred:', row.id); }
  }
  return { checked: rows.length };
}
