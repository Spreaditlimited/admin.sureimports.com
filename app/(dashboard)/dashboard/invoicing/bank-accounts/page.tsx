'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function InvoiceBankAccountsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ accountName: '', accountNumber: '', bankName: '', sortCode: '', currency: 'NGN', country: 'Nigeria' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/invoicing/bank-accounts');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || 'Failed to fetch bank accounts');
      setItems(json?.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch bank accounts');
      toast.error(e.message || 'Failed to fetch bank accounts');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const res = await fetch('/api/invoicing/bank-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) return toast.error(json?.message || 'Failed to add account');
    toast.success('Bank account added');
    setForm({ accountName: '', accountNumber: '', bankName: '', sortCode: '', currency: 'NGN', country: 'Nigeria' });
    load();
  };

  const toggleStatus = async (pidBankAccount: string, current: string) => {
    const status = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await fetch('/api/invoicing/bank-accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pidBankAccount, status }),
    });
    const json = await res.json();
    if (!res.ok) return toast.error(json?.message || 'Failed to update account');
    toast.success('Account updated');
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Invoice Bank Accounts</h1>
        <p className="text-sm text-slate-500">Manage customer-visible payment accounts.</p>
        <p className="mt-1 text-xs text-slate-500">
          {loading ? 'Loading accounts...' : `${items.length} account(s) loaded`}
        </p>
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Add Account</h2>
        <div className="grid md:grid-cols-3 gap-2">
          <input className="px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400" placeholder="Account name" value={form.accountName} onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))} />
          <input className="px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400" placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))} />
          <input className="px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400" placeholder="Bank name" value={form.bankName} onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))} />
          <input className="px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400" placeholder="Sort code (optional)" value={form.sortCode} onChange={(e) => setForm((p) => ({ ...p, sortCode: e.target.value }))} />
          <input className="px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400" placeholder="Currency" value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} />
          <input className="px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400" placeholder="Country" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
        </div>
        <button onClick={create} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500">Add Account</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold mb-3 text-slate-900 dark:text-slate-100">Accounts</h2>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.pidBankAccount} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-2 dark:border-slate-700">
              <div className="text-sm">
                <p className="font-medium text-slate-900 dark:text-slate-100">{it.accountName} - {it.accountNumber}</p>
                <p className="text-slate-500">{it.bankName} {it.sortCode ? `• ${it.sortCode}` : ''} • {it.currency} • {it.country || 'N/A'}</p>
                <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${it.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                  {it.status}
                </p>
              </div>
              <button onClick={() => toggleStatus(it.pidBankAccount, it.status)} className="px-3 py-1.5 rounded border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                {it.status === 'ACTIVE' ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
