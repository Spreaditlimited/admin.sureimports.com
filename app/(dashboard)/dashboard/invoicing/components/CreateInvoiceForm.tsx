'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Search, 
  UserPlus, 
  Plus, 
  Trash2, 
  FileText, 
  User, 
  Calendar, 
  Calculator, 
  RefreshCw,
  Save,
  Send
} from 'lucide-react';

interface Customer {
  pidUser: string;
  userFirstname: string | null;
  userLastname: string | null;
  userEmail: string;
}

interface ItemRow {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface QuickUserForm {
  userFirstname: string;
  userLastname: string;
  userEmail: string;
  phone: string;
  country: string;
  sendSetupLink: boolean;
}

export default function CreateInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedRequestId = searchParams.get('linkedRequestId') || '';

  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showQuickAddUser, setShowQuickAddUser] = useState(false);
  const [quickUserSaving, setQuickUserSaving] = useState(false);
  const [quickUser, setQuickUser] = useState<QuickUserForm>({
    userFirstname: '',
    userLastname: '',
    userEmail: '',
    phone: '',
    country: 'Nigeria',
    sendSetupLink: true,
  });

  const [headerSnapshot, setHeaderSnapshot] = useState('');
  const [footerSnapshot, setFooterSnapshot] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [discountTotal, setDiscountTotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [items, setItems] = useState<ItemRow[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const res = await fetch('/api/invoicing/settings');
      const data = await res.json();
      if (data?.data) {
        const settings = data.data;
        setHeaderSnapshot(`${settings.businessName}\n${settings.businessContactDetails}`);
        setFooterSnapshot(settings.footerNotes || '');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const loadCorporateGiftPrefill = async () => {
      if (!linkedRequestId) return;
      const res = await fetch(`/api/invoicing/corporate-gifts/${linkedRequestId}/prefill`);
      const data = await res.json();
      if (!res.ok || !data?.data?.request) return;

      const gift = data.data.request;
      const matched = (data.data.matchedUsers || []) as Customer[];
      if (matched.length > 0) setSelectedCustomer(matched[0]);
      
      setCustomerSearch(gift.contactEmail || gift.businessName || '');
      setNotes((prev) => {
        const prefix = `Corporate Gift Request: ${gift.pidRequest}\nBusiness: ${gift.businessName}\nContact: ${gift.contactPersonFullName}\nDelivery Location: ${gift.finalDeliveryLocationNigeria}`;
        return prev ? `${prefix}\n\n${prev}` : prefix;
      });
      setItems([{ description: `${gift.productOrItemNeeded} (${gift.preferredQualityLevel})`, quantity: Number(gift.quantityNeeded || 1), unitPrice: 0 }]);
    };
    loadCorporateGiftPrefill();
  }, [linkedRequestId]);

  const searchCustomers = async () => {
    const params = new URLSearchParams({ search: customerSearch, limit: '10', page: '1', status: 'all' });
    const res = await fetch(`/api/crud/customers/fetch?${params.toString()}`);
    const data = await res.json();
    setCustomers(data?.data || []);
  };

  const createQuickUser = async () => {
    if (!quickUser.userFirstname.trim()) return toast.error('First name is required');
    if (!quickUser.userEmail.trim()) return toast.error('Email is required');

    setQuickUserSaving(true);
    try {
      const res = await fetch('/api/invoicing/users/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quickUser),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to create user');

      const created = json.data as Customer;
      setSelectedCustomer(created);
      setCustomers((prev) => [created, ...prev]);
      setShowQuickAddUser(false);
      toast.success('User created and selected.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setQuickUserSaving(false);
    }
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);
  }, [items]);
  
  const grandTotal = useMemo(() => subtotal - Number(discountTotal || 0) + Number(taxTotal || 0), [subtotal, discountTotal, taxTotal]);

  const setRow = (index: number, key: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: key === 'description' ? value : Number(value) } : r)));
  };

  const createInvoice = async (issueNow: boolean) => {
    if (!selectedCustomer) return toast.error('Please select a customer');
    if (!items.length || items.some((i) => !i.description || i.quantity <= 0)) return toast.error('Incomplete line items');

    setSaving(true);
    try {
      const createRes = await fetch('/api/invoicing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pidUser: selectedCustomer.pidUser,
          status: 'DRAFT',
          dueAt: dueAt || null,
          headerSnapshot,
          footerSnapshot,
          notes,
          linkedRequestId: linkedRequestId || null,
          discountTotal,
          taxTotal,
          items,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created?.message);

      if (issueNow) {
        await fetch(`/api/invoicing/invoices/${created.data.pidInvoice}/issue`, { method: 'POST' });
      }
      router.push(`/dashboard/invoicing/${created.data.pidInvoice}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* 1. Customer Identity Section */}
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> 1. Customer Selection
            </h3>
            {selectedCustomer && (
                <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-600 text-[10px] font-bold uppercase tracking-tighter">
                   Customer Linked
                </div>
            )}
        </div>
        
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search registered name or email..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all"
                />
              </div>
              <button 
                onClick={searchCustomers} 
                className="px-4 py-2 bg-background border border-border text-foreground rounded-md text-sm font-semibold hover:bg-muted transition-colors shadow-sm"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setShowQuickAddUser(!showQuickAddUser)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all shadow-sm border ${showQuickAddUser ? 'bg-destructive/5 border-destructive/20 text-destructive' : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'}`}
              >
                {showQuickAddUser ? 'Cancel Quick Add' : 'Quick Add User'}
              </button>
            </div>

            {showQuickAddUser && (
              <div className="p-5 rounded-lg border border-primary/20 bg-primary/5 space-y-4 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                    <UserPlus className="w-3.5 h-3.5" /> Fast Enrollment
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <input value={quickUser.userFirstname} onChange={(e) => setQuickUser({ ...quickUser, userFirstname: e.target.value })} placeholder="First Name *" className="px-3 py-2 text-sm border border-input rounded-md bg-background" />
                    <input value={quickUser.userLastname} onChange={(e) => setQuickUser({ ...quickUser, userLastname: e.target.value })} placeholder="Last Name" className="px-3 py-2 text-sm border border-input rounded-md bg-background" />
                    <input value={quickUser.userEmail} onChange={(e) => setQuickUser({ ...quickUser, userEmail: e.target.value })} placeholder="Email *" className="px-3 py-2 text-sm border border-input rounded-md bg-background" />
                    <input value={quickUser.phone} onChange={(e) => setQuickUser({ ...quickUser, phone: e.target.value })} placeholder="Phone" className="px-3 py-2 text-sm border border-input rounded-md bg-background" />
                    <input value={quickUser.country} onChange={(e) => setQuickUser({ ...quickUser, country: e.target.value })} placeholder="Country" className="px-3 py-2 text-sm border border-input rounded-md bg-background" />
                    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={quickUser.sendSetupLink} onChange={(e) => setQuickUser({ ...quickUser, sendSetupLink: e.target.checked })} className="rounded border-input text-primary focus:ring-ring" />
                        Send setup link via email
                    </label>
                </div>
                <button type="button" disabled={quickUserSaving} onClick={createQuickUser} className="w-full sm:w-auto px-6 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-primary/90 transition-all">
                    {quickUserSaving ? 'Registering...' : 'Complete Enrollment'}
                </button>
              </div>
            )}

            <div className="max-h-52 overflow-y-auto border border-border rounded-lg bg-muted/10 divide-y divide-border">
              {customers.map((c) => (
                <button
                  key={c.pidUser}
                  onClick={() => setSelectedCustomer(c)}
                  className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors ${selectedCustomer?.pidUser === c.pidUser ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/50'}`}
                >
                  <span className="font-bold text-sm text-foreground">
                    {`${c.userFirstname || ''} ${c.userLastname || ''}`.trim() || 'Unnamed Account'}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{c.userEmail} • {c.pidUser}</span>
                </button>
              ))}
              {!customers.length && <p className="px-4 py-6 text-sm text-muted-foreground text-center italic">Use the search bar above to find a registered user.</p>}
            </div>
        </div>
      </div>

      {/* 2. Content & Logistics Section */}
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> 2. Invoice Meta & Notes
            </h3>
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> Due Date
                    </label>
                    <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Header Details (Snapshot)</label>
                    <textarea value={headerSnapshot} onChange={(e) => setHeaderSnapshot(e.target.value)} rows={3} className="w-full px-3 py-2 text-xs border border-input rounded-md bg-background text-foreground font-medium resize-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Footer & Instructions</label>
                    <textarea value={footerSnapshot} onChange={(e) => setFooterSnapshot(e.target.value)} rows={3} className="w-full px-3 py-2 text-xs border border-input rounded-md bg-background text-foreground font-medium resize-none focus:ring-2 focus:ring-ring" />
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Internal Notes & Reference</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={11} className="w-full px-3 py-2 text-xs border border-input rounded-md bg-background text-foreground italic resize-none focus:ring-2 focus:ring-ring" />
            </div>
        </div>
      </div>

      {/* 3. Line Items & Totals */}
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" /> 3. Financial Ledger
            </h3>
        </div>
        <div className="p-6 space-y-6">
            <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm text-foreground">
                    <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 w-32 text-center">Qty</th>
                            <th className="px-4 py-3 w-44 text-right">Unit Price (₦)</th>
                            <th className="px-4 py-3 w-44 text-right">Line Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {items.map((row, i) => (
                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3">
                                    <input value={row.description} onChange={(e) => setRow(i, 'description', e.target.value)} placeholder="Item description..." className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-muted-foreground/50" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-center">
                                        <input type="number" min="1" value={row.quantity} onChange={(e) => setRow(i, 'quantity', e.target.value)} className="w-20 text-center py-1 border border-input rounded bg-background text-sm font-bold" />
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex justify-end">
                                        <input type="number" min="0" value={row.unitPrice} onChange={(e) => setRow(i, 'unitPrice', e.target.value)} className="w-32 text-right py-1 border border-input rounded bg-background text-sm font-bold font-mono" />
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-foreground font-mono">
                                    ₦{(row.quantity * row.unitPrice).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4">
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setItems([...items, { description: '', quantity: 1, unitPrice: 0 }])} className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background rounded-md text-xs font-bold text-foreground hover:bg-muted transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                    <button onClick={() => setItems(prev => prev.length > 1 ? prev.slice(0, -1) : prev)} className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background rounded-md text-xs font-bold text-destructive hover:bg-destructive/5 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Remove Last
                    </button>
                </div>

                <div className="w-full sm:w-auto flex flex-wrap justify-end gap-6 p-4 bg-muted/20 border border-border rounded-lg">
                    <div className="space-y-1.5 min-w-[120px]">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Discount (₦)</label>
                        <input type="number" min="0" value={discountTotal} onChange={(e) => setDiscountTotal(Number(e.target.value || 0))} className="w-full px-3 py-1.5 text-sm font-bold font-mono border border-input rounded-md bg-background text-destructive" />
                    </div>
                    <div className="space-y-1.5 min-w-[120px]">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tax (₦)</label>
                        <input type="number" min="0" value={taxTotal} onChange={(e) => setTaxTotal(Number(e.target.value || 0))} className="w-full px-3 py-1.5 text-sm font-bold font-mono border border-input rounded-md bg-background text-foreground" />
                    </div>
                    <div className="flex flex-col justify-center items-end min-w-[150px] border-l border-border pl-6">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subtotal</span>
                        <span className="text-sm font-medium text-muted-foreground font-mono">₦{subtotal.toLocaleString()}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary mt-2">Grand Total</span>
                        <span className="text-xl font-bold text-foreground font-mono">₦{grandTotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* 4. Submission Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 px-1">
        <button 
          disabled={saving} 
          onClick={() => createInvoice(false)} 
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 bg-background border border-border text-foreground rounded-lg text-sm font-bold hover:bg-muted transition-all shadow-sm focus:ring-2 focus:ring-ring"
        >
          <Save className="w-4 h-4" /> Save as Draft
        </button>
        <button 
          disabled={saving} 
          onClick={() => createInvoice(true)} 
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-sm focus:ring-2 focus:ring-ring"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Finalize & Issue Invoice
        </button>
      </div>

    </div>
  );
}
