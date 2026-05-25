'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
  pidInvoice: string;
  invoiceNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  currency: string;
  grandTotal: string;
  amountPaid: string;
  balanceDue: string;
  status: string;
  createdAt: string;
  dueAt: string | null;
}

export default function InvoicesTable() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const res = await fetch(`/api/invoicing/invoices?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to fetch invoices');
      setItems(data.data || []);
    } catch (e: any) {
      setItems([]);
      setError(e.message || 'Failed to fetch invoices');
      toast.error(e.message || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        acc.total += Number(it.grandTotal || 0);
        acc.paid += Number(it.amountPaid || 0);
        acc.balance += Number(it.balanceDue || 0);
        return acc;
      },
      { total: 0, paid: 0, balance: 0 },
    );
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-500">Total Invoiced</p>
          <p className="text-xl font-semibold">₦{totals.total.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-500">Total Paid</p>
          <p className="text-xl font-semibold text-green-600">₦{totals.paid.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
          <p className="text-xs text-gray-500">Outstanding</p>
          <p className="text-xl font-semibold text-amber-600">₦{totals.balance.toLocaleString()}</p>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex gap-2 w-full md:max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number, customer name, or email"
              className="w-full pl-9 pr-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="ISSUED">Issued</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button onClick={fetchInvoices} className="px-4 py-2 rounded-lg bg-gray-900 text-white">Filter</button>
        </div>
        <Link href="/dashboard/invoicing/create" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white">
          <Plus className="w-4 h-4" />
          Create Invoice
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden bg-white dark:bg-gray-800">
        {error ? <p className="px-4 py-2 text-xs text-red-600 border-b">{error}</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="text-left px-4 py-3">Invoice</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Paid</th>
                <th className="text-right px-4 py-3">Balance</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No invoices found</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.pidInvoice} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{item.customerName || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{item.customerEmail || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3">{item.status}</td>
                    <td className="px-4 py-3 text-right">{item.currency} {Number(item.grandTotal).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{item.currency} {Number(item.amountPaid).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{item.currency} {Number(item.balanceDue).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/invoicing/${item.pidInvoice}`} className="inline-flex items-center gap-1 text-indigo-600">
                        <Eye className="w-4 h-4" /> View
                      </Link>
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
