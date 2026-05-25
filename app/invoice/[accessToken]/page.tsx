'use client';

import { useEffect, useMemo, useState } from 'react';

export default function CustomerInvoicePage({ params }: { params: { accessToken: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimedAmount, setClaimedAmount] = useState('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoice = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/invoicing/public/invoice/${params.accessToken}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load invoice');
      setData(json.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
    const id = setInterval(fetchInvoice, 20000);
    return () => clearInterval(id);
  }, [params.accessToken]);

  const invoice = data?.invoice;
  const accounts = data?.bankAccounts || [];
  const pendingClaims = useMemo(
    () => (invoice?.paymentClaims || []).filter((c: any) => c.status === 'PENDING_CONFIRMATION'),
    [invoice],
  );

  const submitClaim = async () => {
    const amount = Number(claimedAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount paid.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/invoicing/public/invoice/${params.accessToken}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimedAmount: amount,
          selectedBankAccountId: selectedBankAccountId || null,
          paymentReference: paymentReference || null,
          note: note || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to submit payment claim');
      setClaimedAmount('');
      setPaymentReference('');
      setNote('');
      await fetchInvoice();
    } catch (e: any) {
      setError(e.message || 'Failed to submit payment claim');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading invoice...</div>;
  if (error && !invoice) return <div className="p-8 text-red-600">{error}</div>;
  if (!invoice) return <div className="p-8">Invoice not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border bg-white p-6">
          <h1 className="text-2xl font-bold">Invoice {invoice.invoiceNumber}</h1>
          <p className="text-sm text-slate-500">Status: <span className="font-semibold">{invoice.status}</span></p>
          <p className="text-sm text-slate-500">Customer: {invoice.customerName || invoice.customerEmail || 'Customer'}</p>
        </div>

        <div className="rounded-xl border bg-white p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="text-left p-2">Description</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Unit Price</th><th className="text-right p-2">Line Total</th></tr></thead>
            <tbody>
              {invoice.items.map((it: any) => (
                <tr key={it.pidInvoiceItem} className="border-t">
                  <td className="p-2">{it.description}</td>
                  <td className="p-2 text-right">{Number(it.quantity).toLocaleString()}</td>
                  <td className="p-2 text-right">{invoice.currency} {Number(it.unitPrice).toLocaleString()}</td>
                  <td className="p-2 text-right">{invoice.currency} {Number(it.lineTotal).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-sm space-y-1">
            <p>Total: <b>{invoice.currency} {Number(invoice.grandTotal).toLocaleString()}</b></p>
            <p className="text-green-700">Paid: <b>{invoice.currency} {Number(invoice.amountPaid).toLocaleString()}</b></p>
            <p className="text-amber-700">Balance: <b>{invoice.currency} {Number(invoice.balanceDue).toLocaleString()}</b></p>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 space-y-3">
          <h2 className="text-lg font-semibold">Bank Accounts</h2>
          <p className="text-sm text-slate-500">Choose any account and make payment. Then submit payment details below for admin confirmation.</p>
          <div className="space-y-2">
            {accounts.map((acc: any) => (
              <label key={acc.pidBankAccount} className="block rounded-lg border p-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="bankAccount"
                  className="mr-2"
                  checked={selectedBankAccountId === acc.pidBankAccount}
                  onChange={() => setSelectedBankAccountId(acc.pidBankAccount)}
                />
                <span className="font-medium">{acc.accountName}</span> - {acc.accountNumber}, {acc.bankName}
                {acc.sortCode ? ` (Sort code: ${acc.sortCode})` : ''} [{acc.currency}]
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 space-y-3">
          <h2 className="text-lg font-semibold">Mark As Paid / Partially Paid</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input value={claimedAmount} onChange={(e) => setClaimedAmount(e.target.value)} type="number" min="0" placeholder="Amount paid" className="px-3 py-2 border rounded-lg" />
            <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Payment reference (optional)" className="px-3 py-2 border rounded-lg" />
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Notes (optional)" className="w-full px-3 py-2 border rounded-lg" />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button disabled={submitting} onClick={submitClaim} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">
            {submitting ? 'Submitting...' : 'Submit Payment for Confirmation'}
          </button>
          <p className="text-xs text-slate-500">Your invoice will update after admin confirms this payment.</p>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h3 className="font-semibold">Pending Confirmations</h3>
          {pendingClaims.length === 0 ? (
            <p className="text-sm text-slate-500">No pending payment confirmations.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {pendingClaims.map((c: any) => (
                <div key={c.pidClaim} className="rounded-lg border p-3 text-sm">
                  {invoice.currency} {Number(c.claimedAmount).toLocaleString()} • {new Date(c.claimedAt).toLocaleString()} • {c.status}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
