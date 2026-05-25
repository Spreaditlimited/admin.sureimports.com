'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface InvoiceData {
  pidInvoice: string;
  invoiceNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  currency: string;
  status: string;
  grandTotal: string;
  amountPaid: string;
  balanceDue: string;
  dueAt: string | null;
  issuedAt: string | null;
  headerSnapshot: string | null;
  footerSnapshot: string | null;
  notes: string | null;
  items: Array<{ pidInvoiceItem: string; description: string; quantity: string; unitPrice: string; lineTotal: string }>;
  payments: Array<{ pidInvoicePayment: string; amount: string; paymentMethod: string; reference: string | null; paidAt: string }>;
  receipts: Array<{ pidReceipt: string; receiptNumber: string; amount: string; deliveryStatus: string }>;
}

export default function InvoiceDetails({ pidInvoice }: { pidInvoice: string }) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoicing/invoices/${pidInvoice}`);
      const json = await res.json();
      setData(json.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pidInvoice]);

  const issueInvoice = async () => {
    setIssuing(true);
    try {
      const res = await fetch(`/api/invoicing/invoices/${pidInvoice}/issue`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to issue invoice');
      await fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIssuing(false);
    }
  };

  const recordPayment = async () => {
    setRecording(true);
    try {
      const res = await fetch(`/api/invoicing/invoices/${pidInvoice}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(paymentAmount), paymentMethod, reference: paymentRef || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to record payment');
      setPaymentAmount('');
      setPaymentRef('');
      await fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRecording(false);
    }
  };

  const sendInvoice = async () => {
    setSendingInvoice(true);
    try {
      const res = await fetch(`/api/invoicing/invoices/${pidInvoice}/send`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to send invoice');
      toast.success('Invoice email sent successfully.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSendingInvoice(false);
    }
  };

  const sendReceipt = async (pidReceipt: string) => {
    const res = await fetch(`/api/invoicing/receipts/${pidReceipt}/send`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) return toast.error(json?.message || 'Failed to send receipt');
    toast.success('Receipt email sent');
    await fetchData();
  };

  if (loading) return <div className="rounded-xl border p-6 bg-white dark:bg-gray-800">Loading...</div>;
  if (!data) return <div className="rounded-xl border p-6 bg-white dark:bg-gray-800">Invoice not found.</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{data.invoiceNumber}</h2>
            <p className="text-sm text-gray-500">{data.customerName || 'N/A'} • {data.customerEmail || 'N/A'}</p>
            <p className="text-sm text-gray-500">Status: <span className="font-semibold">{data.status}</span></p>
          </div>
          <div className="text-right">
            <p>Total: {data.currency} {Number(data.grandTotal).toLocaleString()}</p>
            <p className="text-green-600">Paid: {data.currency} {Number(data.amountPaid).toLocaleString()}</p>
            <p className="text-amber-600">Balance: {data.currency} {Number(data.balanceDue).toLocaleString()}</p>
            <Link
              href={`/dashboard/invoicing/${pidInvoice}/preview`}
              target="_blank"
              className="mt-2 inline-block rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
            >
              Preview Invoice
            </Link>
            {data.status === 'DRAFT' && (
              <button disabled={issuing} onClick={issueInvoice} className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm">Issue Invoice</button>
            )}
            {data.status !== 'DRAFT' && data.status !== 'CANCELLED' && (
              <button
                disabled={sendingInvoice}
                onClick={sendInvoice}
                className="ml-2 mt-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              >
                {sendingInvoice ? 'Sending...' : 'Send Invoice'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-3">Line Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="text-left p-2">Description</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Unit Price</th><th className="text-right p-2">Line Total</th></tr></thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.pidInvoiceItem} className="border-t">
                  <td className="p-2">{it.description}</td>
                  <td className="p-2 text-right">{Number(it.quantity).toLocaleString()}</td>
                  <td className="p-2 text-right">{data.currency} {Number(it.unitPrice).toLocaleString()}</td>
                  <td className="p-2 text-right">{data.currency} {Number(it.lineTotal).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800 space-y-3">
          <h3 className="font-semibold">Record Payment</h3>
          <input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} type="number" min="0" placeholder="Amount" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
            <option value="POS">POS</option>
            <option value="CARD">Card</option>
          </select>
          <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Reference (optional)" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
          <button disabled={recording} onClick={recordPayment} className="px-4 py-2 rounded-lg bg-gray-900 text-white">Save Payment</button>
        </div>

        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <h3 className="font-semibold mb-3">Payments</h3>
          <div className="space-y-2 max-h-56 overflow-auto">
            {data.payments.length === 0 ? <p className="text-sm text-gray-500">No payments yet.</p> : data.payments.map((p) => (
              <div key={p.pidInvoicePayment} className="rounded-lg border px-3 py-2 text-sm">
                <p className="font-medium">{data.currency} {Number(p.amount).toLocaleString()} • {p.paymentMethod}</p>
                <p className="text-xs text-gray-500">{new Date(p.paidAt).toLocaleString()} • Ref: {p.reference || 'N/A'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-3">Receipts</h3>
        <div className="space-y-2">
          {data.receipts.length === 0 ? <p className="text-sm text-gray-500">No receipts yet.</p> : data.receipts.map((r) => (
            <div key={r.pidReceipt} className="rounded-lg border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{r.receiptNumber}</p>
                <p className="text-xs text-gray-500">Amount: {data.currency} {Number(r.amount).toLocaleString()} • Status: {r.deliveryStatus}</p>
              </div>
              <button onClick={() => sendReceipt(r.pidReceipt)} className="px-3 py-1.5 rounded-lg border text-sm">Send Receipt</button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <h3 className="font-semibold mb-2">Header Snapshot</h3>
          <pre className="text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300">{data.headerSnapshot || 'N/A'}</pre>
        </div>
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <h3 className="font-semibold mb-2">Footer Snapshot</h3>
          <pre className="text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-300">{data.footerSnapshot || 'N/A'}</pre>
        </div>
      </div>
    </div>
  );
}
