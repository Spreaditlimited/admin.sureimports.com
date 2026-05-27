'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function InvoicePaymentClaimsPage() {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    try {
      const res = await fetch('/api/invoicing/payment-claims');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load claims');
      setItems(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load claims');
      setItems([]);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (pidClaim: string) => {
    try {
      const res = await fetch(`/api/invoicing/payment-claims/${encodeURIComponent(pidClaim)}/approve`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) return toast.error(json?.message || 'Failed to approve claim');
      toast.success('Claim approved and invoice updated');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve claim');
    }
  };

  const reject = async (pidClaim: string) => {
    try {
      const res = await fetch(`/api/invoicing/payment-claims/${encodeURIComponent(pidClaim)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) return toast.error(json?.message || 'Failed to reject claim');
      toast.success('Claim rejected');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject claim');
    }
  };

  const formatAmount = (value: any) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '0';
    return amount.toLocaleString();
  };

  const formatDateTime = (value: any) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Payment Claims</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Approve or reject customer-submitted payment updates.</p>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            No claims found.
          </div>
        ) : (
          items.map((it, index) => (
            <div
              key={String(it.pidClaim || `claim-${index}`)}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {it.invoice?.invoiceNumber || it.pidInvoice}
                </p>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  {String(it.status || 'UNKNOWN')}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                {it.invoice?.customerName || it.invoice?.customerEmail || 'Customer'} • {it.currency}{' '}
                {formatAmount(it.claimedAmount)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Claimed: {formatDateTime(it.claimedAt)} • Ref: {it.paymentReference || 'N/A'}
              </p>

              {it.status === 'PENDING_CONFIRMATION' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => approve(it.pidClaim)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-500"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reject(it.pidClaim)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-500"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
