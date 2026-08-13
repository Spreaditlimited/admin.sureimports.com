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
  userPhone?: string | null;
  phone?: string | null;
  businessName?: string | null;
  address?: string | null;
  userShippingAddress?: string | null;
  userShippingAddress2?: string | null;
  userState?: string | null;
  userCountry?: string | null;
  country?: string | null;
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
  businessName: string;
  phone: string;
  country: string;
  sendSetupLink: boolean;
}

interface CreateInvoiceFormProps {
  pidInvoice?: string;
}

interface InvoiceEditPayload {
  status?: string | null;
  user?: {
    pidUser?: string;
    userFirstname?: string | null;
    userLastname?: string | null;
    userEmail?: string;
  };
  headerSnapshot?: string | null;
  footerSnapshot?: string | null;
  customerBusinessName?: string | null;
  customerContactName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerNotes?: string | null;
  notes?: string | null;
  dueAt?: string | null;
  discountTotal?: string | number | null;
  taxTotal?: string | number | null;
  items?: Array<{
    description?: string;
    quantity?: string | number;
    unitPrice?: string | number;
  }>;
  pidQuotation?: string | null;
}

export default function CreateInvoiceForm({ pidInvoice }: CreateInvoiceFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = Boolean(pidInvoice);
  const linkedRequestId = searchParams.get('linkedRequestId') || '';
  const linkedShippingOnlyId = searchParams.get('linkedShippingOnlyId') || '';
  const requestedPidQuotation = searchParams.get('pidQuotation') || '';

  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showQuickAddUser, setShowQuickAddUser] = useState(false);
  const [quickUserSaving, setQuickUserSaving] = useState(false);
  const [quickUser, setQuickUser] = useState<QuickUserForm>({
    userFirstname: '',
    userLastname: '',
    userEmail: '',
    businessName: '',
    phone: '',
    country: 'Nigeria',
    sendSetupLink: true,
  });

  const [headerSnapshot, setHeaderSnapshot] = useState('');
  const [footerSnapshot, setFooterSnapshot] = useState('');
  const [customerBusinessName, setCustomerBusinessName] = useState('');
  const [customerContactName, setCustomerContactName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [discountTotal, setDiscountTotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [items, setItems] = useState<ItemRow[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [pidQuotation, setPidQuotation] = useState('');
  const [availableQuotations, setAvailableQuotations] = useState<Array<{ pidQuotation: string; quotationNumber: string; customerName: string }>>([]);
  const [saving, setSaving] = useState(false);
  const isIssuedEdit = isEditMode && invoiceStatus && invoiceStatus !== 'DRAFT';

  useEffect(() => {
    const loadSettings = async () => {
      if (isEditMode) return;
      const res = await fetch('/api/invoicing/settings');
      const data = await res.json();
      if (data?.data) {
        const settings = data.data;
        setHeaderSnapshot(`${settings.businessName}\n${settings.businessContactDetails}`);
        setFooterSnapshot(settings.footerNotes || '');
      }
    };
    loadSettings();
  }, [isEditMode]);

  useEffect(() => {
    const loadExistingInvoice = async () => {
      if (!pidInvoice) return;
      const res = await fetch(`/api/invoicing/invoices/${encodeURIComponent(pidInvoice)}`);
      const json = await res.json();
      if (!res.ok || !json?.data) {
        toast.error(json?.message || 'Failed to load invoice');
        return;
      }

      const invoice = json.data as InvoiceEditPayload;
      if (!invoice.user?.pidUser || !invoice.user?.userEmail) {
        toast.error('Invoice is missing customer linkage');
        return;
      }
      const customer: Customer = {
        pidUser: invoice.user.pidUser,
        userFirstname: invoice.user?.userFirstname || null,
        userLastname: invoice.user?.userLastname || null,
        userEmail: invoice.user.userEmail,
      };
      setSelectedCustomer(customer);
      setCustomers([customer]);
      setCustomerSearch(customer.userEmail || '');
      setHeaderSnapshot(invoice.headerSnapshot || '');
      setFooterSnapshot(invoice.footerSnapshot || '');
      setCustomerBusinessName(invoice.customerBusinessName || '');
      setCustomerContactName(invoice.customerContactName || `${customer.userFirstname || ''} ${customer.userLastname || ''}`.trim());
      setCustomerEmail(invoice.customerEmail || customer.userEmail);
      setCustomerPhone(invoice.customerPhone || '');
      setCustomerAddress(invoice.customerAddress || '');
      setCustomerNotes(invoice.customerNotes || '');
      setNotes(invoice.notes || '');
      setInvoiceStatus(invoice.status || '');
      setPidQuotation(invoice.pidQuotation || '');
      setDueAt(invoice.dueAt ? new Date(invoice.dueAt).toISOString().slice(0, 10) : '');
      setDiscountTotal(Number(invoice.discountTotal || 0));
      setTaxTotal(Number(invoice.taxTotal || 0));
      setItems(
        Array.isArray(invoice.items) && invoice.items.length > 0
          ? invoice.items.map((item) => ({
              description: item.description || '',
              quantity: Number(item.quantity || 0),
              unitPrice: Number(item.unitPrice || 0),
            }))
          : [{ description: '', quantity: 1, unitPrice: 0 }],
      );
    };

    void loadExistingInvoice();
  }, [pidInvoice]);

  useEffect(() => {
    const loadQuotation = async () => {
      if (isEditMode || !requestedPidQuotation) return;
      const response = await fetch(`/api/invoicing/quotation-builder/${encodeURIComponent(requestedPidQuotation)}/prefill`);
      const json = await response.json();
      if (!response.ok || !json?.data?.user) return;
      const quotation = json.data;
      const customer = quotation.user as Customer;
      selectCustomer(customer);
      setCustomerSearch(customer.userEmail || quotation.customerName || '');
      setPidQuotation(quotation.pidQuotation);
      setAvailableQuotations([{ pidQuotation: quotation.pidQuotation, quotationNumber: quotation.quotationNumber, customerName: quotation.customerName }]);
      const quoteData = quotation.quoteData || {};
      setNotes((current) => current || `Quotation: ${quotation.quotationNumber}`);
      if (Array.isArray(quoteData.products) && quoteData.products.length) {
        setItems(quoteData.products.map((product: any) => ({ description: product.name || product.description || quoteData.title || 'Quoted products', quantity: Number(product.quantity || 1), unitPrice: Number(product.unitPrice || 0) })));
      }
    };
    void loadQuotation();
  }, [isEditMode, requestedPidQuotation]);

  useEffect(() => {
    const loadCustomerQuotations = async () => {
      if (!selectedCustomer?.pidUser) return;
      const response = await fetch('/api/invoicing/quotation-builder', { cache: 'no-store' });
      const json = await response.json();
      setAvailableQuotations((json?.data || []).filter((quote: any) => quote.pidUser === selectedCustomer.pidUser));
    };
    void loadCustomerQuotations();
  }, [selectedCustomer?.pidUser]);

  useEffect(() => {
    const loadCorporateGiftPrefill = async () => {
      if (isEditMode) return;
      if (!linkedRequestId) return;
      const res = await fetch(`/api/invoicing/corporate-gifts/${linkedRequestId}/prefill`);
      const data = await res.json();
      if (!res.ok || !data?.data?.request) return;

      const gift = data.data.request;
      const matched = (data.data.matchedUsers || []) as Customer[];
      if (matched.length > 0) setSelectedCustomer(matched[0]);
      setCustomerBusinessName(gift.businessName || '');
      setCustomerContactName(gift.contactPersonFullName || '');
      setCustomerEmail(gift.contactEmail || matched[0]?.userEmail || '');
      setCustomerPhone(gift.contactPhone || matched[0]?.userPhone || '');
      setCustomerAddress(gift.finalDeliveryLocationNigeria || '');
      
      setCustomerSearch(gift.contactEmail || gift.businessName || '');
      setNotes((prev) => {
        const prefix = `Corporate Sourcing Request: ${gift.pidRequest}\nBusiness: ${gift.businessName}\nContact: ${gift.contactPersonFullName}\nDelivery Location: ${gift.finalDeliveryLocationNigeria}`;
        return prev ? `${prefix}\n\n${prev}` : prefix;
      });
      setItems([{ description: `${gift.productOrItemNeeded} (${gift.preferredQualityLevel})`, quantity: Number(gift.quantityNeeded || 1), unitPrice: 0 }]);
    };
    loadCorporateGiftPrefill();
  }, [isEditMode, linkedRequestId]);

  useEffect(() => {
    const loadShippingOnlyPrefill = async () => {
      if (isEditMode) return;
      if (!linkedShippingOnlyId) return;
      const res = await fetch(`/api/invoicing/shipping-only/${linkedShippingOnlyId}/prefill`);
      const data = await res.json();
      if (!res.ok || !data?.data?.request) return;

      const shippingOnly = data.data.request;
      const matched = (data.data.matchedUsers || []) as Customer[];
      if (matched.length > 0) {
        const customer = matched[0];
        setSelectedCustomer(customer);
        setCustomerBusinessName(customer.businessName || '');
        setCustomerContactName(`${customer.userFirstname || ''} ${customer.userLastname || ''}`.trim());
        setCustomerEmail(customer.userEmail || '');
        setCustomerPhone(customer.userPhone || customer.phone || '');
        setCustomerAddress(shippingOnly.shippingTo || customer.address || customer.userShippingAddress || '');
      }

      setCustomerSearch(shippingOnly.shippingName || shippingOnly.pidShippingOnly || '');
      setNotes((prev) => {
        const prefix = `Shipping Only Request: ${shippingOnly.pidShippingOnly}\nShipping Name: ${shippingOnly.shippingName || 'N/A'}\nDestination: ${shippingOnly.shippingTo || 'N/A'}\nWeight: ${shippingOnly.grossWeight || 'N/A'}`;
        return prev ? `${prefix}\n\n${prev}` : prefix;
      });
      setItems([
        {
          description: `Shipping Service (${shippingOnly.shippingName || shippingOnly.pidShippingOnly})`,
          quantity: 1,
          unitPrice: 0,
        },
      ]);
    };
    loadShippingOnlyPrefill();
  }, [isEditMode, linkedShippingOnlyId]);

  const searchCustomers = async () => {
    const params = new URLSearchParams({ search: customerSearch, limit: '10', page: '1', status: 'all' });
    const res = await fetch(`/api/crud/customers/fetch?${params.toString()}`);
    const data = await res.json();
    setCustomers(data?.data || []);
  };

  const selectCustomer = (customer: Customer) => {
    const contactName = `${customer.userFirstname || ''} ${customer.userLastname || ''}`.trim();
    const address = [
      customer.address || customer.userShippingAddress,
      customer.userShippingAddress2,
      customer.userState,
      customer.userCountry || customer.country,
    ].filter(Boolean).join(', ');
    setSelectedCustomer(customer);
    setCustomerBusinessName(customer.businessName || '');
    setCustomerContactName(contactName);
    setCustomerEmail(customer.userEmail || '');
    setCustomerPhone(customer.userPhone || customer.phone || '');
    setCustomerAddress(address);
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
      selectCustomer(created);
      setCustomers((prev) => [created, ...prev]);
      setShowQuickAddUser(false);
      toast.success('User created and selected.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
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

  const saveInvoice = async (issueNow: boolean) => {
    if (!selectedCustomer) return toast.error('Please select a customer');
    if (!customerBusinessName.trim() && !customerContactName.trim()) return toast.error('Enter a customer or contact name');
    if (!customerEmail.trim()) return toast.error('Enter the customer email address');
    if (!items.length || items.some((i) => !i.description || i.quantity <= 0)) return toast.error('Incomplete line items');

    setSaving(true);
    try {
      const endpoint = isEditMode
        ? `/api/invoicing/invoices/${encodeURIComponent(pidInvoice || '')}`
        : '/api/invoicing/invoices';
      const method = isEditMode ? 'PATCH' : 'POST';
      const payload = isEditMode
        ? {
            dueAt: dueAt || null,
            headerSnapshot,
            footerSnapshot,
            customerBusinessName,
            customerContactName,
            customerEmail,
            customerPhone,
            customerAddress,
            customerNotes,
            notes,
            pidQuotation: pidQuotation || null,
            discountTotal,
            taxTotal,
            items,
          }
        : {
            pidUser: selectedCustomer.pidUser,
            status: 'DRAFT',
            dueAt: dueAt || null,
            headerSnapshot,
            footerSnapshot,
            customerBusinessName,
            customerContactName,
            customerEmail,
            customerPhone,
            customerAddress,
            customerNotes,
            notes,
            linkedRequestId: linkedRequestId || null,
            linkedShippingOnlyId: linkedShippingOnlyId || null,
            pidQuotation: pidQuotation || null,
            discountTotal,
            taxTotal,
            items,
          };

      const createRes = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created?.message);

      const targetPidInvoice = isEditMode ? pidInvoice : created.data.pidInvoice;
      if (issueNow && (!isEditMode || invoiceStatus === 'DRAFT')) {
        const issueRes = await fetch(`/api/invoicing/invoices/${targetPidInvoice}/issue`, { method: 'POST' });
        if (!issueRes.ok) {
          const issueJson = await issueRes.json().catch(() => ({}));
          throw new Error(issueJson?.message || 'Failed to issue invoice');
        }
      }
      router.push(`/dashboard/invoicing/${targetPidInvoice}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save invoice');
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
                   {isIssuedEdit ? `Editing ${invoiceStatus.replace(/_/g, ' ')}` : 'Customer Linked'}
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
                    placeholder={isEditMode ? "Customer is locked for invoice edits" : "Search registered name or email..."}
                    disabled={isEditMode}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all"
                />
              </div>
              <button 
                onClick={searchCustomers} 
                disabled={isEditMode}
                className="px-4 py-2 bg-background border border-border text-foreground rounded-md text-sm font-semibold hover:bg-muted transition-colors shadow-sm"
              >
                Search
              </button>
              <button
                type="button"
                disabled={isEditMode}
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
                    <input value={quickUser.businessName} onChange={(e) => setQuickUser({ ...quickUser, businessName: e.target.value })} placeholder="Business Name (Optional)" className="px-3 py-2 text-sm border border-input rounded-md bg-background" />
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
                  onClick={() => selectCustomer(c)}
                  className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors ${selectedCustomer?.pidUser === c.pidUser ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/50'}`}
                >
                  <span className="font-bold text-sm text-foreground">
                    {c.businessName || `${c.userFirstname || ''} ${c.userLastname || ''}`.trim() || 'Unnamed Account'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.businessName ? `Contact: ${`${c.userFirstname || ''} ${c.userLastname || ''}`.trim()} • ` : ''}{c.userEmail}
                  </span>
                </button>
              ))}
              {!customers.length && <p className="px-4 py-6 text-sm text-muted-foreground text-center italic">Use the search bar above to find a registered user.</p>}
            </div>

            {selectedCustomer && (
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Invoice billing details</h4>
                  <p className="mt-1 text-[11px] text-muted-foreground">Prefilled from the profile. Changes here apply only to this invoice.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Business / Customer name</label>
                    <input value={customerBusinessName} onChange={(e) => setCustomerBusinessName(e.target.value)} placeholder="Leave blank for an individual customer" className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact person</label>
                    <input value={customerContactName} onChange={(e) => setCustomerContactName(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                    <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone number</label>
                    <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Enter a phone number" className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background" />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Billing address</label>
                    <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={3} placeholder="Enter the address to print on this invoice" className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background resize-y" />
                  </div>
                </div>
              </div>
            )}
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
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Related quotation (optional)</label>
                    <select value={pidQuotation} onChange={(e) => setPidQuotation(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring">
                      <option value="">No quotation linked</option>
                      {availableQuotations.map((quotation) => <option key={quotation.pidQuotation} value={quotation.pidQuotation}>{quotation.quotationNumber} — {quotation.customerName}</option>)}
                    </select>
                    <p className="text-[10px] text-muted-foreground">Only quotations linked to the selected customer account are shown.</p>
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
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer-visible invoice notes</label>
                <textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} rows={5} placeholder="These notes will appear on the invoice and PDF." className="w-full px-3 py-2 text-xs border border-input rounded-md bg-background text-foreground resize-y focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Private admin notes & reference</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Internal only. Never shown to the customer." className="w-full px-3 py-2 text-xs border border-input rounded-md bg-background text-foreground italic resize-y focus:ring-2 focus:ring-ring" />
              </div>
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
          onClick={() => saveInvoice(false)} 
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 bg-background border border-border text-foreground rounded-lg text-sm font-bold hover:bg-muted transition-all shadow-sm focus:ring-2 focus:ring-ring"
        >
          <Save className="w-4 h-4" /> {isIssuedEdit ? 'Save Invoice Changes' : isEditMode ? 'Save Draft Changes' : 'Save as Draft'}
        </button>
        {!isIssuedEdit ? (
          <button
            disabled={saving}
            onClick={() => saveInvoice(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-sm focus:ring-2 focus:ring-ring"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isEditMode ? 'Save & Issue Invoice' : 'Finalize & Issue Invoice'}
          </button>
        ) : null}
      </div>

    </div>
  );
}
