'use client';

import { useEffect, useMemo, useState } from 'react';

export default function CustomerInvoiceClient({ accessToken }: { accessToken: string }) {
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
      const res = await fetch(`/api/invoicing/public/invoice/${accessToken}`);
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
  }, [accessToken]);

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
      const res = await fetch(`/api/invoicing/public/invoice/${accessToken}/claim`, {
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

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 mx-auto"></div>
        <p className="text-slate-600 font-medium">Loading secure invoice...</p>
      </div>
    </div>
  );

  if (error && !invoice) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl border border-red-100">
        <div className="text-red-500 mb-4 text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-slate-900">Unable to load invoice</h2>
        <p className="mt-2 text-slate-600">{error}</p>
      </div>
    </div>
  );

  if (!invoice) return <div className="p-8 text-slate-900">Invoice not found.</div>;

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PARTIAL': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans text-slate-900">
      {/* Top Header/Nav */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-4 flex justify-between items-center">
          <span className="text-sm font-bold tracking-tighter text-[#0b3b88]">SURE IMPORTS</span>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(invoice.status)}`}>
            {invoice.status}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 pt-8 space-y-8">
        {/* Invoice Summary Card */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Invoice {invoice.invoiceNumber}</h1>
              <p className="text-slate-500 mt-1">Issued to <span className="text-slate-900 font-medium">{invoice.customerName || invoice.customerEmail}</span></p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xs uppercase font-bold text-slate-400 tracking-widest">Balance Due</p>
              <p className="text-4xl font-black text-[#0b3b88]">
                <span className="text-xl mr-1">{invoice.currency}</span>
                {Number(invoice.balanceDue).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-slate-100 bg-slate-50/50">
            <div className="p-6 border-r border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Currency</p>
              <p className="font-semibold">{invoice.currency}</p>
            </div>
            <div className="p-6 md:border-r border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Total Amount</p>
              <p className="font-semibold">{Number(invoice.grandTotal).toLocaleString()}</p>
            </div>
            <div className="p-6 border-r border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Total Paid</p>
              <p className="font-semibold text-emerald-600">{Number(invoice.amountPaid).toLocaleString()}</p>
            </div>
            <div className="p-6">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Items</p>
              <p className="font-semibold">{invoice.items.length} Lines</p>
            </div>
          </div>
        </section>

        {/* Line Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-white">
            <h2 className="font-bold text-slate-800">Itemized Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 text-left font-bold uppercase tracking-tighter">Description</th>
                  <th className="px-6 py-4 text-right font-bold uppercase tracking-tighter">Qty</th>
                  <th className="px-6 py-4 text-right font-bold uppercase tracking-tighter">Unit Price</th>
                  <th className="px-6 py-4 text-right font-bold uppercase tracking-tighter text-slate-900">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((it: any) => (
                  <tr key={it.pidInvoiceItem} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{it.description}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{Number(it.quantity).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{invoice.currency} {Number(it.unitPrice).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{invoice.currency} {Number(it.lineTotal).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Left Column: Bank Selection */}
          <div className="md:col-span-3 space-y-6">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-2">1. Payment Instructions</h2>
              <p className="text-sm text-slate-500 mb-6">Please transfer the amount to one of the following accounts:</p>
              
              <div className="space-y-3">
                {accounts.map((acc: any) => (
                  <label
                    key={acc.pidBankAccount}
                    className={`relative block cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      selectedBankAccountId === acc.pidBankAccount
                        ? 'border-[#0b3b88] bg-blue-50/50 ring-4 ring-blue-50'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="bankAccount"
                            className="h-4 w-4 text-[#0b3b88] focus:ring-[#0b3b88]"
                            checked={selectedBankAccountId === acc.pidBankAccount}
                            onChange={() => setSelectedBankAccountId(acc.pidBankAccount)}
                          />
                          <p className="font-bold text-slate-900">{acc.accountName}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase">{acc.currency}</span>
                        </div>
                        <div className="mt-2 pl-6 grid grid-cols-2 gap-y-1 text-sm">
                          <span className="text-slate-400 text-xs">Bank:</span>
                          <span className="text-slate-700 font-medium">{acc.bankName}</span>
                          <span className="text-slate-400 text-xs">Acc Number:</span>
                          <span className="text-slate-700 font-medium select-all">{acc.accountNumber}</span>
                          {acc.sortCode && (
                            <>
                              <span className="text-slate-400 text-xs">Sort Code:</span>
                              <span className="text-slate-700 font-medium">{acc.sortCode}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Submissions History */}
            {pendingClaims.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Pending Confirmations
                </h3>
                <div className="space-y-3">
                  {pendingClaims.map((c: any) => (
                    <div key={c.pidClaim} className="flex justify-between items-center rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm">
                      <div>
                        <p className="font-bold text-slate-900">{invoice.currency} {Number(c.claimedAmount).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">{new Date(c.claimedAt).toLocaleDateString()} at {new Date(c.claimedAt).toLocaleTimeString()}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded">Awaiting Review</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Claim Form */}
          <div className="md:col-span-2">
            <div className="bg-slate-900 rounded-2xl p-6 shadow-xl sticky top-24">
              <h2 className="text-lg font-bold text-white mb-2">2. Confirm Payment</h2>
              <p className="text-blue-200/60 text-sm mb-6">Notify us once you've made the transfer.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-blue-200/80 uppercase mb-1 block">Amount Paid ({invoice.currency})</label>
                  <input
                    value={claimedAmount}
                    onChange={(e) => setClaimedAmount(e.target.value)}
                    type="number"
                    placeholder="0.00"
                    className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/20 focus:bg-white/20 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-blue-200/80 uppercase mb-1 block">Payment Reference</label>
                  <input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID or Name"
                    className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/20 focus:bg-white/20 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-blue-200/80 uppercase mb-1 block">Additional Note</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Optional message..."
                    className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white placeholder:text-white/20 focus:bg-white/20 focus:outline-none transition-all resize-none"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-500/20 border border-red-500/50 p-3 text-xs text-red-200">
                    {error}
                  </div>
                )}

                <button
                  disabled={submitting}
                  onClick={submitClaim}
                  className="w-full rounded-xl bg-blue-600 px-4 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                      Processing...
                    </span>
                  ) : 'Confirm My Payment'}
                </button>
                <p className="text-[10px] text-center text-blue-200/40">
                  Secure transmission to Sure Imports Admin.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}