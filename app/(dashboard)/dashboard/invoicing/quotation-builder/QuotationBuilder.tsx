'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  FileImage,
  FileText,
  Mail,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

import { calculateQuote } from '@/lib/quotation-builder/calculations';
import type {
  QuoteBuildInput,
  QuoteCurrency,
  QuoteProduct,
  QuotationRateSnapshot,
  QuotationSourceAsset,
} from '@/lib/quotation-builder/types';

type Extraction = {
  title: string;
  introduction: string;
  internalSupplierName: string | null;
  products: QuoteProduct[];
  extractionNotes: string[];
};

type HistoryRow = {
  pidQuotation: string;
  quotationNumber: string;
  customerName: string;
  customerLocation: string | null;
  pidUser: string | null;
  linkedRequestId: string | null;
  status: string;
  maxPages: number;
  pdfBytes: number | null;
  createdAt: string;
  lastSentAt: string | null;
  sendCount: number;
  user: { userFirstname: string | null; userLastname: string | null; userEmail: string } | null;
  invoices: Array<{ pidInvoice: string; invoiceNumber: string; status: string }>;
};

type Customer = {
  pidUser: string;
  userFirstname: string | null;
  userLastname: string | null;
  userEmail: string;
  businessName?: string | null;
};

const emptyProduct = (index: number): QuoteProduct => ({
  id: `product-${Date.now()}-${index}`,
  name: '', description: '', unitPrice: 0, currency: 'RMB', quantity: 1,
  unitWeightKg: null, totalWeightKg: null, unitsPerCarton: null,
  cartonLengthCm: null, cartonWidthCm: null, cartonHeightCm: null, totalCbm: null,
  domesticTransportCost: 0, domesticTransportCurrency: 'RMB', notes: '', imageSourceIndex: null,
});

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ngn(value: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(value || 0);
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="space-y-1.5"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>{children}{hint ? <span className="block text-[10px] text-muted-foreground">{hint}</span> : null}</label>;
}

const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium text-foreground outline-none transition focus:ring-2 focus:ring-primary/30';

export default function QuotationBuilder({ linkedRequestId = '' }: { linkedRequestId?: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [assets, setAssets] = useState<QuotationSourceAsset[]>([]);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [rates, setRates] = useState<QuotationRateSnapshot | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [products, setProducts] = useState<QuoteProduct[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickUser, setQuickUser] = useState({ userFirstname: '', userLastname: '', userEmail: '', businessName: '', phone: '', country: 'Nigeria', sendSetupLink: true });
  const [customerLocation, setCustomerLocation] = useState('Lagos, Nigeria');
  const [title, setTitle] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [maxPages, setMaxPages] = useState(2);
  const [includeAir, setIncludeAir] = useState(true);
  const [includeSea, setIncludeSea] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingPid, setSendingPid] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [configRes, historyRes] = await Promise.all([
        fetch('/api/invoicing/quotation-builder/config', { cache: 'no-store' }),
        fetch('/api/invoicing/quotation-builder', { cache: 'no-store' }),
      ]);
      const [configJson, historyJson] = await Promise.all([configRes.json(), historyRes.json()]);
      if (!configRes.ok || !configJson?.data) throw new Error(configJson?.message || 'Could not load quotation rates.');
      setRates(configJson.data);
      setHistory(Array.isArray(historyJson?.data) ? historyJson.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load quotation builder.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  useEffect(() => {
    if (!linkedRequestId) return;
    const loadSourcingRequest = async () => {
      try {
        const response = await fetch(`/api/invoicing/corporate-gifts/${encodeURIComponent(linkedRequestId)}/prefill`, { cache: 'no-store' });
        const json = await response.json();
        if (!response.ok || !json?.data?.request) throw new Error(json?.message || 'Could not load the corporate sourcing request.');
        const request = json.data.request;
        const matched = (json.data.matchedUsers || []) as Customer[];
        if (matched[0]) selectCustomer(matched[0]);
        setCustomerName(request.businessName || request.contactPersonFullName || '');
        setCustomerSearch(request.contactEmail || '');
        setCustomerLocation(request.finalDeliveryLocationNigeria || '');
        setTitle(`Quotation for ${request.productOrItemNeeded}`);
        setIntroduction(`Prepared from corporate sourcing request ${request.pidRequest}.`);
        setProducts([{
          ...emptyProduct(0),
          name: request.productOrItemNeeded || '',
          description: request.detailedSpecifications || '',
          quantity: Number(request.quantityNeeded || 1),
        }]);
        if (!matched[0]) {
          setShowQuickAdd(true);
          const names = String(request.contactPersonFullName || '').trim().split(/\s+/);
          setQuickUser((current) => ({
            ...current,
            userFirstname: names.shift() || '',
            userLastname: names.join(' '),
            userEmail: request.contactEmail || '',
            businessName: request.businessName || '',
            phone: request.whatsappNumber || '',
          }));
          toast.info('No matching customer account was found. Review and create the prefilled account before building the quote.');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not load the corporate sourcing request.');
      }
    };
    void loadSourcingRequest();
  }, [linkedRequestId]);

  const draftInput = useMemo<QuoteBuildInput | null>(() => rates ? ({
    customerName, customerLocation, title, introduction, products, sourceAssets: assets,
    rates, includeAir, includeSea, maxPages, additionalNotes,
  }) : null, [rates, customerName, customerLocation, title, introduction, products, assets, includeAir, includeSea, maxPages, additionalNotes]);

  const calculated = useMemo(() => {
    if (!draftInput || !products.length) return null;
    try { return calculateQuote(draftInput); } catch { return null; }
  }, [draftInput, products.length]);

  const analyse = async () => {
    if (!files.length) return toast.error('Upload at least one image or PDF.');
    setAnalysing(true);
    try {
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      const response = await fetch('/api/invoicing/quotation-builder/extract', { method: 'POST', body: form });
      const json = await response.json();
      if (!response.ok || !json?.data) throw new Error(json?.message || 'Could not analyse source files.');
      const next = json.data.extraction as Extraction;
      setExtraction(next);
      setAssets(json.data.assets || []);
      setProducts(next.products || []);
      setTitle(next.title || '');
      setIntroduction(next.introduction || '');
      toast.success(`${next.products.length} product${next.products.length === 1 ? '' : 's'} extracted. Review the fields before building.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Source analysis failed.');
    } finally {
      setAnalysing(false);
    }
  };

  const updateProduct = (index: number, patch: Partial<QuoteProduct>) => setProducts((current) => current.map((product, i) => i === index ? { ...product, ...patch } : product));
  const removeProduct = (index: number) => setProducts((current) => current.filter((_, i) => i !== index));

  const build = async () => {
    if (!draftInput) return;
    setBuilding(true);
    try {
      const response = await fetch('/api/invoicing/quotation-builder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draftInput, pidUser: selectedCustomer?.pidUser, linkedRequestId: linkedRequestId || null, extractedData: extraction }),
      });
      const json = await response.json();
      if (!response.ok || !json?.data) throw new Error(json?.message || 'Could not build quotation.');
      toast.success(`${json.data.quotationNumber} built and saved.`);
      window.open(json.data.pdfUrl, '_blank', 'noopener,noreferrer');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Quotation build failed.');
    } finally {
      setBuilding(false);
    }
  };

  const searchCustomers = async () => {
    const params = new URLSearchParams({ search: customerSearch, limit: '10', page: '1', status: 'all' });
    const response = await fetch(`/api/crud/customers/fetch?${params.toString()}`);
    const json = await response.json();
    setCustomers(Array.isArray(json?.data) ? json.data : []);
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.userEmail);
    setCustomers([]);
    setCustomerName(customer.businessName || `${customer.userFirstname || ''} ${customer.userLastname || ''}`.trim());
  };

  const quickAddCustomer = async () => {
    if (!quickUser.userFirstname.trim() || !quickUser.userEmail.trim()) return toast.error('First name and email are required.');
    setQuickAdding(true);
    try {
      const response = await fetch('/api/invoicing/users/quick-create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(quickUser) });
      const json = await response.json();
      if (!response.ok || !json?.data) throw new Error(json?.message || 'Could not create customer account.');
      selectCustomer(json.data as Customer);
      setShowQuickAdd(false);
      toast.success('Customer account created and selected.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create customer account.');
    } finally {
      setQuickAdding(false);
    }
  };

  const sendQuotation = async (pidQuotation: string) => {
    setSendingPid(pidQuotation);
    try {
      const response = await fetch(`/api/invoicing/quotation-builder/${encodeURIComponent(pidQuotation)}/send`, { method: 'POST' });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.message || 'Could not send quotation.');
      toast.success(json?.sourcingStatus === 'Sourced' ? 'Quotation sent and sourcing request moved to Sourced.' : 'Quotation emailed with the PDF attached.');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send quotation.');
    } finally {
      setSendingPid('');
    }
  };

  if (loading && !rates) return <div className="flex min-h-[360px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  return <div className="space-y-7 pb-12">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary"><Sparkles className="h-3.5 w-3.5" /> AI-assisted invoicing</div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Quotation Builder</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Upload supplier documents, review the extracted commercial data, override any rate or field, and produce a branded Sure Imports quotation.</p>
      </div>
      <button onClick={() => void loadData()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"><RefreshCw className="h-4 w-4" /> Refresh configuration</button>
    </div>

    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/20 px-6 py-4"><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-foreground"><UploadCloud className="h-4 w-4 text-primary" /> 1. Upload source files</h2></div>
      <div className="p-6">
        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background px-6 text-center transition hover:border-primary/50 hover:bg-primary/5">
          <FileImage className="mb-3 h-8 w-8 text-primary" />
          <span className="text-sm font-bold text-foreground">Choose images or PDF quotations</span>
          <span className="mt-1 text-xs text-muted-foreground">Up to 8 files, 12 MB each. JPEG, PNG, WEBP and PDF.</span>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
        </label>
        {files.length ? <div className="mt-4 flex flex-wrap gap-2">{files.map((file) => <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-medium"><FileText className="h-3.5 w-3.5 text-primary" />{file.name}</span>)}</div> : null}
        <div className="mt-5 flex justify-end"><button disabled={!files.length || analysing} onClick={analyse} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-50">{analysing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{analysing ? 'Reading every source…' : 'Analyse files'}</button></div>
      </div>
    </section>

    {extraction?.extractionNotes?.length ? <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><p className="text-xs font-black uppercase tracking-wider text-amber-700">Review notes</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{extraction.extractionNotes.map((note, index) => <li key={index}>{note}</li>)}</ul></div> : null}

    <section id="quotation-history" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/20 px-6 py-4"><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-foreground"><FileText className="h-4 w-4 text-primary" /> 2. Customer and quotation</h2></div>
      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div className="md:col-span-2 space-y-2">
          <Field label="Customer account"><div className="flex gap-2"><input className={inputClass} value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search registered customer name or email" /><button type="button" onClick={searchCustomers} className="rounded-lg border border-border bg-background px-4 text-xs font-bold hover:bg-muted">Search</button><button type="button" onClick={() => setShowQuickAdd((value) => !value)} className="rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground">{showQuickAdd ? 'Cancel' : 'Quick add'}</button></div></Field>
          {showQuickAdd ? <div className="grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 md:grid-cols-2 lg:grid-cols-3"><input className={inputClass} value={quickUser.userFirstname} onChange={(e) => setQuickUser({ ...quickUser, userFirstname: e.target.value })} placeholder="First name *" /><input className={inputClass} value={quickUser.userLastname} onChange={(e) => setQuickUser({ ...quickUser, userLastname: e.target.value })} placeholder="Last name" /><input className={inputClass} value={quickUser.userEmail} onChange={(e) => setQuickUser({ ...quickUser, userEmail: e.target.value })} placeholder="Email *" /><input className={inputClass} value={quickUser.businessName} onChange={(e) => setQuickUser({ ...quickUser, businessName: e.target.value })} placeholder="Business name" /><input className={inputClass} value={quickUser.phone} onChange={(e) => setQuickUser({ ...quickUser, phone: e.target.value })} placeholder="Phone" /><button type="button" disabled={quickAdding} onClick={quickAddCustomer} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{quickAdding ? 'Creating…' : 'Create and select'}</button></div> : null}
          {customers.length ? <div className="overflow-hidden rounded-lg border border-border bg-background">{customers.map((customer) => <button key={customer.pidUser} type="button" onClick={() => selectCustomer(customer)} className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted"><span className="text-sm font-bold">{customer.businessName || `${customer.userFirstname || ''} ${customer.userLastname || ''}`.trim() || 'Customer'}</span><span className="text-xs text-muted-foreground">{customer.userEmail}</span></button>)}</div> : null}
          {selectedCustomer ? <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm"><strong>{customerName}</strong><span className="ml-2 text-muted-foreground">{selectedCustomer.userEmail}</span></div> : null}
        </div>
        <Field label="Customer name on quotation"><input className={inputClass} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer or business name" /></Field>
        <Field label="Customer location"><input className={inputClass} value={customerLocation} onChange={(e) => setCustomerLocation(e.target.value)} /></Field>
        <Field label="Quotation title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product quotation title" /></Field>
        <Field label="Maximum pages"><select className={inputClass} value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value))}>{[2,3,4,5,6,7,8].map((value) => <option key={value} value={value}>{value} pages</option>)}</select></Field>
        <div className="md:col-span-2"><Field label="Customer-facing introduction"><textarea className={`${inputClass} min-h-24`} value={introduction} onChange={(e) => setIntroduction(e.target.value)} /></Field></div>
      </div>
    </section>

    <section className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-foreground"><PackagePlus className="h-4 w-4 text-primary" /> 3. Products</h2><button onClick={() => setProducts((current) => [...current, emptyProduct(current.length)])} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold hover:bg-muted"><Plus className="h-4 w-4" /> Add product</button></div>
      {!products.length ? <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Analyse source files or add a product manually.</div> : products.map((product, index) => <article key={product.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-5 py-3"><strong className="text-sm text-foreground">Product {index + 1}</strong><button onClick={() => removeProduct(index)} className="rounded-md p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2"><Field label="Product name"><input className={inputClass} value={product.name} onChange={(e) => updateProduct(index, { name: e.target.value })} /></Field></div>
          <Field label="Quantity"><input type="number" min="0" className={inputClass} value={product.quantity} onChange={(e) => updateProduct(index, { quantity: n(e.target.value) })} /></Field>
          <div className="grid grid-cols-[1fr_92px] gap-2"><Field label="Unit price"><input type="number" min="0" step="0.01" className={inputClass} value={product.unitPrice} onChange={(e) => updateProduct(index, { unitPrice: n(e.target.value) })} /></Field><Field label="Currency"><select className={inputClass} value={product.currency} onChange={(e) => updateProduct(index, { currency: e.target.value as QuoteCurrency })}>{['RMB','USD','NGN'].map((value) => <option key={value}>{value}</option>)}</select></Field></div>
          <div className="md:col-span-2 xl:col-span-4"><Field label="Description"><textarea className={`${inputClass} min-h-20`} value={product.description} onChange={(e) => updateProduct(index, { description: e.target.value })} /></Field></div>
          <Field label="Unit weight (kg)"><input type="number" min="0" step="0.001" className={inputClass} value={product.unitWeightKg ?? ''} onChange={(e) => updateProduct(index, { unitWeightKg: e.target.value ? n(e.target.value) : null })} /></Field>
          <Field label="Total weight (kg)" hint="Overrides unit weight × quantity"><input type="number" min="0" step="0.001" className={inputClass} value={product.totalWeightKg ?? ''} onChange={(e) => updateProduct(index, { totalWeightKg: e.target.value ? n(e.target.value) : null })} /></Field>
          <Field label="Units per carton"><input type="number" min="0" step="1" className={inputClass} value={product.unitsPerCarton ?? ''} onChange={(e) => updateProduct(index, { unitsPerCarton: e.target.value ? n(e.target.value) : null })} /></Field>
          <Field label="Total CBM" hint="Overrides calculated carton volume"><input type="number" min="0" step="0.0001" className={inputClass} value={product.totalCbm ?? ''} onChange={(e) => updateProduct(index, { totalCbm: e.target.value ? n(e.target.value) : null })} /></Field>
          <Field label="Carton length (cm)"><input type="number" min="0" step="0.1" className={inputClass} value={product.cartonLengthCm ?? ''} onChange={(e) => updateProduct(index, { cartonLengthCm: e.target.value ? n(e.target.value) : null })} /></Field>
          <Field label="Carton width (cm)"><input type="number" min="0" step="0.1" className={inputClass} value={product.cartonWidthCm ?? ''} onChange={(e) => updateProduct(index, { cartonWidthCm: e.target.value ? n(e.target.value) : null })} /></Field>
          <Field label="Carton height (cm)"><input type="number" min="0" step="0.1" className={inputClass} value={product.cartonHeightCm ?? ''} onChange={(e) => updateProduct(index, { cartonHeightCm: e.target.value ? n(e.target.value) : null })} /></Field>
          <div className="grid grid-cols-[1fr_92px] gap-2"><Field label="China transport"><input type="number" min="0" step="0.01" className={inputClass} value={product.domesticTransportCost} onChange={(e) => updateProduct(index, { domesticTransportCost: n(e.target.value) })} /></Field><Field label="Currency"><select className={inputClass} value={product.domesticTransportCurrency} onChange={(e) => updateProduct(index, { domesticTransportCurrency: e.target.value as QuoteCurrency })}>{['RMB','USD','NGN'].map((value) => <option key={value}>{value}</option>)}</select></Field></div>
        </div>
      </article>)}
    </section>

    {rates ? <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/20 px-6 py-4"><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-foreground"><Settings2 className="h-4 w-4 text-primary" /> 4. Applied rates and overrides</h2></div>
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="NGN per RMB"><input type="number" className={inputClass} value={rates.ngnPerCny} onChange={(e) => setRates({ ...rates, ngnPerCny: n(e.target.value) })} /></Field>
        <Field label="NGN per USD"><input type="number" className={inputClass} value={rates.ngnPerUsd} onChange={(e) => setRates({ ...rates, ngnPerUsd: n(e.target.value) })} /></Field>
        <Field label="Service charge (%)"><input type="number" className={inputClass} value={rates.serviceChargePercent} onChange={(e) => setRates({ ...rates, serviceChargePercent: n(e.target.value) })} /></Field>
        <Field label="VAT on service charge (%)"><input type="number" className={inputClass} value={rates.vatPercent} onChange={(e) => setRates({ ...rates, vatPercent: n(e.target.value) })} /></Field>
        <Field label="Air rate (USD/kg)"><input type="number" className={inputClass} value={rates.airRateUsdPerKg} onChange={(e) => setRates({ ...rates, airRateUsdPerKg: n(e.target.value) })} /></Field>
        <Field label="Quotation sea rate (NGN/CBM)"><input type="number" className={inputClass} value={rates.seaRateNgnPerCbm} onChange={(e) => setRates({ ...rates, seaRateNgnPerCbm: n(e.target.value) })} /></Field>
        <label className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-bold"><input type="checkbox" checked={includeSea} onChange={(e) => setIncludeSea(e.target.checked)} className="h-4 w-4" /> Include sea option</label>
        <label className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-bold"><input type="checkbox" checked={includeAir} onChange={(e) => setIncludeAir(e.target.checked)} className="h-4 w-4" /> Include air option</label>
        <div className="sm:col-span-2 lg:col-span-4"><Field label="Additional commercial note"><textarea className={`${inputClass} min-h-20`} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} /></Field></div>
      </div>
    </section> : null}

    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider"><Calculator className="h-4 w-4 text-primary" /> Live estimate</h2>{calculated ? <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4"><div><span className="block text-xs text-muted-foreground">Before shipping</span><strong>{ngn(calculated.subtotalBeforeShippingNgn)}</strong></div>{includeSea ? <div><span className="block text-xs text-muted-foreground">Landed by sea</span><strong>{ngn(calculated.landedBySeaNgn)}</strong></div> : null}{includeAir ? <div><span className="block text-xs text-muted-foreground">Landed by air</span><strong>{ngn(calculated.landedByAirNgn)}</strong></div> : null}<div><span className="block text-xs text-muted-foreground">Products</span><strong>{products.length}</strong></div></div> : <p className="mt-2 text-sm text-muted-foreground">Complete the product fields to see the estimate.</p>}</div>
        <button disabled={building || !products.length || !customerName || !title || !selectedCustomer} onClick={build} className="inline-flex min-w-48 items-center justify-center gap-2 rounded-lg bg-primary px-7 py-3.5 text-sm font-black text-primary-foreground shadow-sm disabled:opacity-50">{building ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{building ? 'Building and saving…' : 'Build quote'}</button>
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/20 px-6 py-4"><h2 className="text-sm font-black uppercase tracking-wider">Recent quotations</h2></div>
      {!history.length ? <div className="p-8 text-center text-sm text-muted-foreground">No generated quotations yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Invoice</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{history.map((row) => <tr key={row.pidQuotation} className="border-t border-border"><td className="px-5 py-4 font-bold">{row.quotationNumber}{row.linkedRequestId ? <span className="mt-1 block text-[10px] font-medium text-muted-foreground">Sourcing: {row.linkedRequestId}</span> : null}</td><td className="px-5 py-4"><strong className="block">{row.customerName}</strong><span className="text-xs text-muted-foreground">{row.user?.userEmail || 'Customer account not linked'}</span></td><td className="px-5 py-4 text-muted-foreground"><span className="block">{new Date(row.createdAt).toLocaleString('en-NG')}</span>{row.lastSentAt ? <span className="text-[10px]">Sent {row.sendCount} time{row.sendCount === 1 ? '' : 's'}</span> : null}</td><td className="px-5 py-4">{row.invoices?.length ? row.invoices.map((invoice) => <a key={invoice.pidInvoice} href={`/dashboard/invoicing/${invoice.pidInvoice}`} className="block font-bold text-primary hover:underline">{invoice.invoiceNumber}</a>) : <span className="text-xs text-muted-foreground">Not invoiced</span>}</td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><a target="_blank" rel="noreferrer" href={`/api/invoicing/quotation-builder/${encodeURIComponent(row.pidQuotation)}/pdf`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted"><FileText className="h-3.5 w-3.5" /> Open PDF</a><button type="button" disabled={!row.pidUser || sendingPid === row.pidQuotation} onClick={() => sendQuotation(row.pidQuotation)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{sendingPid === row.pidQuotation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Email</button>{!row.invoices?.length ? <a href={`/dashboard/invoicing/create?pidQuotation=${encodeURIComponent(row.pidQuotation)}${row.linkedRequestId ? `&linkedRequestId=${encodeURIComponent(row.linkedRequestId)}` : ''}`} className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted">Create invoice</a> : null}</div></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
