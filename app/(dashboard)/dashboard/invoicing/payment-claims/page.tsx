'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function InvoicePaymentClaimsPage() {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const res = await fetch('/api/invoicing/payment-claims');
    const json = await res.json();
    setItems(json?.data || []);
  };

  useEffect(() => { load(); }, []);

  const approve = async (pidClaim: string) => {
    const res = await fetch(`/api/invoicing/payment-claims/${pidClaim}/approve`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) return toast.error(json?.message || 'Failed to approve claim');
    toast.success('Claim approved and invoice updated');
    load();
  };

  const reject = async (pidClaim: string) => {
    const res = await fetch(`/api/invoicing/payment-claims/${pidClaim}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok) return toast.error(json?.message || 'Failed to reject claim');
    toast.success('Claim rejected');
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Claims</h1>
        <p className="text-sm text-slate-500">Approve or reject customer-submitted payment updates.</p>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-slate-500">No claims found.</p> : items.map((it) => (
          <div key={it.pidClaim} className="rounded-xl border bg-white p-4">
            <p className="font-semibold">{it.invoice?.invoiceNumber || it.pidInvoice} • {it.status}</p>
            <p className="text-sm text-slate-600">{it.invoice?.customerName || it.invoice?.customerEmail || 'Customer'} • {it.currency} {Number(it.claimedAmount).toLocaleString()}</p>
            <p className="text-xs text-slate-500">Claimed: {new Date(it.claimedAt).toLocaleString()} • Ref: {it.paymentReference || 'N/A'}</p>
            {it.status === 'PENDING_CONFIRMATION' && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => approve(it.pidClaim)} className="px-3 py-1.5 rounded bg-green-600 text-white text-sm">Approve</button>
                <button onClick={() => reject(it.pidClaim)} className="px-3 py-1.5 rounded bg-red-600 text-white text-sm">Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
