'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Receipt {
  pidReceipt: string;
  receiptNumber: string;
  pidInvoice: string;
  amount: string;
  issuedAt: string;
  deliveryStatus: string;
  invoice: {
    invoiceNumber: string;
    customerName: string | null;
    customerEmail: string | null;
    currency: string;
  };
}

export default function ReceiptsTable() {
  const [items, setItems] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/invoicing/receipts?${params.toString()}`);
      const json = await res.json();
      setItems(json.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sendReceipt = async (pidReceipt: string) => {
    const res = await fetch(`/api/invoicing/receipts/${pidReceipt}/send`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) return toast.error(json?.message || 'Failed to send receipt');
    toast.success('Receipt email sent');
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search receipt number or invoice"
          className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
        />
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-gray-900 text-white">Search</button>
      </div>

      <div className="rounded-xl border overflow-hidden bg-white dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="text-left px-4 py-3">Receipt</th>
                <th className="text-left px-4 py-3">Invoice</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No receipts found</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.pidReceipt} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.receiptNumber}</p>
                      <p className="text-xs text-gray-500">{new Date(item.issuedAt).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3">{item.invoice?.invoiceNumber || item.pidInvoice}</td>
                    <td className="px-4 py-3">
                      <p>{item.invoice?.customerName || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{item.invoice?.customerEmail || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{item.invoice?.currency || 'NGN'} {Number(item.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">{item.deliveryStatus}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => sendReceipt(item.pidReceipt)} className="px-3 py-1.5 rounded-lg border text-sm">Send</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
