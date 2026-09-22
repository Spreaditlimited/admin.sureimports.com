'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Pencil, X, Loader2, Plus, CreditCard, Globe, Power, RefreshCw, Landmark } from 'lucide-react';

export default function InvoiceBankAccountsPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ 
    accountName: '', 
    accountNumber: '', 
    bankName: '', 
    sortCode: '', 
    currency: 'NGN', 
    country: 'Nigeria' 
  });

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
      toast.error('Failed to load accounts');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({ accountName: '', accountNumber: '', bankName: '', sortCode: '', currency: 'NGN', country: 'Nigeria' });
  };
  const edit = (account: any) => {
    setEditingId(account.pidBankAccount);
    setForm({ accountName: account.accountName || '', accountNumber: account.accountNumber || '', bankName: account.bankName || '', sortCode: account.sortCode || '', currency: account.currency || 'NGN', country: account.country || '' });
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    editorRef.current?.querySelector('input')?.focus({ preventScroll: true });
  };
  const create = async () => {
    if (saving) return;
    if (!form.accountName.trim() || !form.accountNumber.trim() || !form.bankName.trim())
      return toast.error('Enter the account name, account number and bank name.');
    setSaving(true);
    try {
      const res = await fetch('/api/invoicing/bank-accounts', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...(editingId ? { pidBankAccount: editingId } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Could not save the bank account.');
      toast.success(editingId ? 'Bank account updated successfully.' : 'Bank account added successfully.');
      resetForm();
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save the bank account.'); }
    finally { setSaving(false); }
  };
  const toggleStatus = async (pidBankAccount: string, current: string) => {
    if (statusBusy) return;
    const status = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusBusy(pidBankAccount);
    try {
      const res = await fetch('/api/invoicing/bank-accounts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pidBankAccount, status }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Could not update this account.');
      toast.success(`Account marked as ${status.toLowerCase()}.`);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update this account.'); }
    finally { setStatusBusy(null); }
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settlement Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage bank accounts visible to customers for invoice payments.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border rounded-md shadow-sm">
           <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
           <span className="text-xs font-bold text-foreground uppercase tracking-tight">
             {loading ? 'Syncing...' : `${items.length} Account(s)`}
           </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      {/* 2. Add Account Configuration Panel */}
      <div ref={editorRef} className="scroll-mt-24 bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                {editingId ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />} {editingId ? 'Edit Bank Account' : 'Add New Bank Account'}
            </h2>
        </div>
        
        <fieldset disabled={saving} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wide text-muted-foreground">Account Name</label>
                    <input 
                        className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring transition-all" 
                        placeholder="e.g. Sure Imports Limited" 
                        value={form.accountName} 
                        onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))} 
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wide text-muted-foreground">Account Number</label>
                    <input 
                        className="w-full px-3 py-2 text-sm font-mono tracking-widest border border-input rounded-md bg-background focus:ring-2 focus:ring-ring transition-all" 
                        placeholder="0000000000" 
                        value={form.accountNumber} 
                        onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))} 
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wide text-muted-foreground">Bank Name</label>
                    <input 
                        className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring transition-all" 
                        placeholder="e.g. Zenith Bank" 
                        value={form.bankName} 
                        onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))} 
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wide text-muted-foreground">Sort Code (Optional)</label>
                    <input 
                        className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring transition-all" 
                        placeholder="00-00-00" 
                        value={form.sortCode} 
                        onChange={(e) => setForm((p) => ({ ...p, sortCode: e.target.value }))} 
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wide text-muted-foreground">Currency</label>
                    <input 
                        className="w-full px-3 py-2 text-sm font-bold border border-input rounded-md bg-background focus:ring-2 focus:ring-ring transition-all" 
                        placeholder="NGN" 
                        value={form.currency} 
                        onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} 
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wide text-muted-foreground">Country</label>
                    <input 
                        className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring transition-all" 
                        placeholder="Nigeria" 
                        value={form.country} 
                        onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} 
                    />
                </div>
            </div>
            
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              {editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-semibold"><X className="h-4 w-4" />Cancel editing</button>}
                <button 
                    onClick={create} 
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 transition-all focus:ring-2 focus:ring-ring"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="w-4 h-4" />} {saving ? 'Saving…' : editingId ? 'Save changes' : 'Register account'}
                </button>
            </div>
        </fieldset>
      </div>

      {/* 3. Account List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((it) => (
            <div 
                key={it.pidBankAccount} 
                className="bg-card border border-border rounded-lg p-5 shadow-sm flex flex-col justify-between gap-6 transition-all hover:border-primary/30"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-muted rounded-lg border border-border">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    it.status === 'ACTIVE' 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {it.status}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-base font-bold text-foreground truncate">{it.accountName}</p>
                <p className="text-lg font-mono font-bold text-primary tracking-widest">{it.accountNumber}</p>
                
                <div className="pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1"><Landmark className="w-3 h-3" /> {it.bankName}</span>
                    {it.sortCode && <span>• Sort: {it.sortCode}</span>}
                    <span className="flex items-center gap-1 border-l border-border pl-3 ml-1"><Globe className="w-3 h-3" /> {it.country} ({it.currency})</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex flex-wrap justify-end gap-3">
                  <button type="button" disabled={saving || !!statusBusy} onClick={() => edit(it)} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"><Pencil className="h-4 w-4" />Edit account</button>
                  <button 
                    disabled={saving || !!statusBusy}
                    onClick={() => toggleStatus(it.pidBankAccount, it.status)} 
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all border focus:ring-2 focus:ring-ring ${
                        it.status === 'ACTIVE'
                        ? 'bg-background text-destructive border-border hover:bg-destructive/5 hover:border-destructive/30'
                        : 'bg-background text-emerald-600 border-border hover:bg-emerald-50/50 hover:border-emerald-500/30'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {it.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                  </button>
              </div>
            </div>
          ))}

          {items.length === 0 && !loading && (
             <div className="md:col-span-2 py-16 bg-card border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                    <Landmark className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No settlement accounts found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Add your first bank account to enable manual invoice payments.</p>
             </div>
          )}
      </div>
    </div>
  );
}
