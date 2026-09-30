import Link from 'next/link';
type Invoice = {
  linkedRequestId: string;
  invoiceNumber: string;
  customerName: string;
  customerNotes: string;
  currency: string;
  grandTotal: string;
  amountPaid: string;
  balanceDue: string;
  status: string;
  items: { pidInvoiceItem: string; description: string; lineTotal: string }[];
  receipts: { pidReceipt: string; receiptNumber: string }[];
};
export default function VehicleInvoiceSummary({
  invoice,
  accessToken,
}: {
  invoice: Invoice;
  accessToken: string;
}) {
  const money = (value: string) =>
    `${invoice.currency} ${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
  return (
    <main className="public-site-theme mx-auto max-w-3xl space-y-6 px-6 py-12">
      <p className="text-sm font-semibold text-slate-500">
        SURE IMPORTS · VEHICLE IMPORTS
      </p>
      <h1 className="text-3xl font-bold">Invoice {invoice.invoiceNumber}</h1>
      <p>
        {invoice.customerName} · {invoice.status}
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {invoice.items.map((item) => (
          <div
            key={item.pidInvoiceItem}
            className="flex justify-between gap-6 border-b border-slate-200 py-4"
          >
            <p>{item.description}</p>
            <strong className="whitespace-nowrap">
              {money(item.lineTotal)}
            </strong>
          </div>
        ))}
        <p className="mt-5">
          Invoiced total: <strong>{money(invoice.grandTotal)}</strong>
        </p>
        <p>Confirmed payments: {money(invoice.amountPaid)}</p>
        <p>
          Balance due: <strong>{money(invoice.balanceDue)}</strong>
        </p>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-7">
        {invoice.customerNotes}
      </p>
      <div className="flex flex-wrap gap-5">
        <Link
          className="rounded-lg bg-indigo-600 px-5 py-3 text-white"
          href={`/dashboard/vehicles/${invoice.linkedRequestId.slice(8)}`}
        >
          Payment & order dashboard
        </Link>
        <a
          className="rounded-lg border border-slate-200 px-5 py-3"
          href={`/api/invoicing/public/invoice/${accessToken}/pdf`}
        >
          Download invoice PDF
        </a>
      </div>
      <p className="text-sm text-slate-500">
        Bank details, quote validity and private payment-proof submission are
        available in your vehicle order dashboard.
      </p>
      {invoice.receipts?.map((r) => (
        <p key={r.pidReceipt}>
          <a
            className="underline"
            href={`/receipt/${r.pidReceipt}?accessToken=${encodeURIComponent(accessToken)}`}
          >
            Receipt {r.receiptNumber}
          </a>
        </p>
      ))}
    </main>
  );
}
