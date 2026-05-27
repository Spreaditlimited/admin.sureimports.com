import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ pidInvoice: string }>;
}) {
  const { pidInvoice } = await params;

  const invoice = await prisma.invoices.findUnique({
    where: { pidInvoice },
    include: {
      items: {
        orderBy: { lineNo: 'asc' },
      },
      user: {
        select: {
          userFirstname: true,
          userLastname: true,
          userEmail: true,
          userPhone: true,
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  let corporateBusinessName: string | null = null;
  if (invoice.linkedRequestId) {
    const gift = await prisma.corporate_gift_request.findUnique({
      where: { pidRequest: invoice.linkedRequestId },
      select: {
        businessName: true,
        contactPersonFullName: true,
        contactEmail: true,
      },
    });

    if (gift) {
      corporateBusinessName = gift.businessName || null;
      const derivedNameBase =
        gift.contactPersonFullName ||
        invoice.customerName ||
        `${invoice.user.userFirstname || ''} ${invoice.user.userLastname || ''}`.trim() ||
        'Customer';
      invoice.customerName = gift.businessName
        ? `${derivedNameBase} (${gift.businessName})`
        : derivedNameBase;
      if (!invoice.customerEmail && gift.contactEmail) {
        invoice.customerEmail = gift.contactEmail;
      }
    }
  }

  const customerName =
    invoice.customerName ||
    `${invoice.user.userFirstname || ''} ${invoice.user.userLastname || ''}`.trim() ||
    'Customer';
  const customerEmail = invoice.customerEmail || invoice.user.userEmail || 'N/A';
  const customerPhone = invoice.customerPhone || invoice.user.userPhone || 'N/A';

  return (
    <div className="p-6">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Sure Imports</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Invoice Preview</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              This is the customer-facing invoice layout.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Invoice Number</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{invoice.invoiceNumber}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Status: <span className="font-semibold text-slate-700 dark:text-slate-200">{invoice.status}</span>
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Billed To</h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">{customerName}</p>
            {corporateBusinessName && (
              <p className="text-sm text-slate-700 dark:text-slate-300">{corporateBusinessName}</p>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400">{customerEmail}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{customerPhone}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Invoice Dates</h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Issued: {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString('en-NG') : 'Not issued'}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Due: {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString('en-NG') : 'Not set'}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Paid: {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('en-NG') : 'Not fully paid'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left dark:bg-slate-800/60">
                <th className="border border-slate-200 px-3 py-2 dark:border-slate-700">#</th>
                <th className="border border-slate-200 px-3 py-2 dark:border-slate-700">Description</th>
                <th className="border border-slate-200 px-3 py-2 text-right dark:border-slate-700">Qty</th>
                <th className="border border-slate-200 px-3 py-2 text-right dark:border-slate-700">Unit Price</th>
                <th className="border border-slate-200 px-3 py-2 text-right dark:border-slate-700">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.pidInvoiceItem}>
                  <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{item.lineNo}</td>
                  <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{item.description}</td>
                  <td className="border border-slate-200 px-3 py-2 text-right dark:border-slate-700">
                    {Number(item.quantity).toLocaleString()}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-right dark:border-slate-700">
                    {invoice.currency} {Number(item.unitPrice).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-slate-200 px-3 py-2 text-right dark:border-slate-700">
                    {invoice.currency} {Number(item.lineTotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
              <span>{invoice.currency} {Number(invoice.subtotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Discount</span>
              <span>{invoice.currency} {Number(invoice.discountTotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Tax</span>
              <span>{invoice.currency} {Number(invoice.taxTotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold dark:border-slate-700">
              <span>Total</span>
              <span>{invoice.currency} {Number(invoice.grandTotal).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-green-700 dark:text-green-400">
              <span>Amount Paid</span>
              <span>{invoice.currency} {Number(invoice.amountPaid).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-amber-700 dark:text-amber-400">
              <span>Balance Due</span>
              <span>{invoice.currency} {Number(invoice.balanceDue).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {(invoice.headerSnapshot || invoice.footerSnapshot || invoice.notes) && (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {invoice.headerSnapshot && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Issuer Details</h3>
                <pre className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300">{invoice.headerSnapshot}</pre>
              </div>
            )}
            {invoice.footerSnapshot && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Payment Notes</h3>
                <pre className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300">{invoice.footerSnapshot}</pre>
              </div>
            )}
            {invoice.notes && (
              <div className="rounded-xl border border-slate-200 p-4 md:col-span-2 dark:border-slate-700">
                <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Additional Notes</h3>
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{invoice.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
