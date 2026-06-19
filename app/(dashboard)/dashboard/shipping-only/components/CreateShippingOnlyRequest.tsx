'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  PackagePlus,
  RefreshCw,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { formatShippingPlanDisplay } from '@/lib/formatShippingPlan';

type Customer = {
  pidUser: string;
  userFirstname: string | null;
  userLastname: string | null;
  userEmail: string;
  userPhone?: string | null;
};

type CountryOption = {
  pidCountry: string;
  countryName: string | null;
  shippingPlans?: Array<{
    pidShippingPlan: string;
    shippingPlanName: string | null;
  }>;
};

type QuickUserForm = {
  userFirstname: string;
  userLastname: string;
  userEmail: string;
  businessName: string;
  phone: string;
  country: string;
  sendSetupLink: boolean;
};

type ShippingForm = {
  shippingName: string;
  shippingTo: string;
  grossWeight: string;
  trackingNumber: string;
  shippingPlan: string;
  expectedShipments: string;
  wantProductVerification: boolean;
  wantConsolidation: boolean;
  multipleSuppliers: boolean;
  description: string;
};

const emptyQuickUser: QuickUserForm = {
  userFirstname: '',
  userLastname: '',
  userEmail: '',
  businessName: '',
  phone: '',
  country: 'Nigeria',
  sendSetupLink: true,
};

const emptyShippingForm: ShippingForm = {
  shippingName: '',
  shippingTo: '',
  grossWeight: '',
  trackingNumber: '',
  shippingPlan: '',
  expectedShipments: '',
  wantProductVerification: false,
  wantConsolidation: false,
  multipleSuppliers: false,
  description: '',
};

export default function CreateShippingOnlyRequest({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [quickUser, setQuickUser] = useState<QuickUserForm>(emptyQuickUser);
  const [shippingForm, setShippingForm] = useState<ShippingForm>(emptyShippingForm);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadCountries = async () => {
      try {
        const res = await fetch('/api/get-data/countries-shippingplan');
        const data = await res.json();
        setCountries(Array.isArray(data) ? data : []);
      } catch {
        setCountries([]);
      }
    };

    loadCountries();
  }, [open]);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.pidCountry === shippingForm.shippingTo),
    [countries, shippingForm.shippingTo],
  );

  const shippingPlans = selectedCountry?.shippingPlans || [];

  const resetForm = () => {
    setCustomerMode('existing');
    setCustomerSearch('');
    setCustomers([]);
    setSelectedCustomer(null);
    setQuickUser(emptyQuickUser);
    setShippingForm(emptyShippingForm);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const searchCustomers = async () => {
    if (!customerSearch.trim()) return toast.error('Enter a name or email to search');
    setSearching(true);
    try {
      const params = new URLSearchParams({ search: customerSearch, limit: '10', page: '1', status: 'all' });
      const res = await fetch(`/api/crud/customers/fetch?${params.toString()}`);
      const data = await res.json();
      setCustomers(data?.data || []);
    } catch {
      toast.error('Failed to search customers');
    } finally {
      setSearching(false);
    }
  };

  const updateShippingForm = <K extends keyof ShippingForm>(key: K, value: ShippingForm[K]) => {
    setShippingForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'shippingTo' ? { shippingPlan: '' } : null),
    }));
  };

  const customerPayload =
    customerMode === 'new'
      ? quickUser
      : selectedCustomer
        ? {
            userFirstname: selectedCustomer.userFirstname || '',
            userLastname: selectedCustomer.userLastname || '',
            userEmail: selectedCustomer.userEmail,
            phone: selectedCustomer.userPhone || '',
            country: '',
            businessName: '',
            sendSetupLink: false,
          }
        : null;

  const submit = async () => {
    if (customerMode === 'existing' && !selectedCustomer) return toast.error('Select a customer');
    if (customerMode === 'new' && !quickUser.userFirstname.trim()) return toast.error('Customer first name is required');
    if (customerMode === 'new' && !quickUser.userEmail.trim()) return toast.error('Customer email is required');
    if (!shippingForm.shippingName.trim()) return toast.error('Shipping name is required');
    if (!shippingForm.shippingTo) return toast.error('Destination is required');
    if (!shippingForm.shippingPlan) return toast.error('Shipping plan is required');
    if (!shippingForm.grossWeight.trim()) return toast.error('Gross weight is required');

    setSaving(true);
    try {
      const res = await fetch('/api/shipping-only/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerMode,
          pidUser: customerMode === 'existing' ? selectedCustomer?.pidUser : null,
          customer: customerPayload,
          ...shippingForm,
          whatsappNumber:
            customerMode === 'new'
              ? quickUser.phone
              : selectedCustomer?.userPhone || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to create shipping request');

      const setupLinkSent = Boolean(data?.data?.setupLinkSent);
      toast.success(
        customerMode === 'new' && quickUser.sendSetupLink
          ? setupLinkSent
            ? 'Shipping request created. Password setup email sent.'
            : 'Shipping request created. Password setup email was not sent.'
          : 'Shipping request created',
      );
      closeModal();
      window.dispatchEvent(new Event('shipping-only-request-created'));
      onCreated?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create shipping request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        <PackagePlus className="h-4 w-4" />
        Create Shipping Request
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-card shadow-soft animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Create Shipping Request</h2>
                <p className="text-xs text-muted-foreground">Create or select a customer, then add freight details.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <section className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('existing')}
                    className={`rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                      customerMode === 'existing'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    Existing Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('new')}
                    className={`rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                      customerMode === 'new'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    <UserPlus className="mr-1 inline h-3.5 w-3.5" />
                    New Customer
                  </button>
                </div>

                {customerMode === 'existing' ? (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={customerSearch}
                          onChange={(event) => setCustomerSearch(event.target.value)}
                          placeholder="Search customer name or email..."
                          className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={searchCustomers}
                        disabled={searching}
                        className="rounded-md border border-border bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                      >
                        {searching ? 'Searching...' : 'Search'}
                      </button>
                    </div>

                    {customers.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {customers.map((customer) => {
                          const active = selectedCustomer?.pidUser === customer.pidUser;
                          return (
                            <button
                              key={customer.pidUser}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShippingForm((current) => ({
                                  ...current,
                                  shippingName:
                                    current.shippingName ||
                                    `${customer.userFirstname || ''} ${customer.userLastname || ''}`.trim() ||
                                    customer.userEmail,
                                }));
                              }}
                              className={`rounded-md border p-3 text-left transition-colors ${
                                active
                                  ? 'border-emerald-500/40 bg-emerald-500/10'
                                  : 'border-border bg-background hover:bg-muted'
                              }`}
                            >
                              <p className="text-sm font-bold text-foreground">
                                {`${customer.userFirstname || ''} ${customer.userLastname || ''}`.trim() || customer.userEmail}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{customer.userEmail}</p>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={quickUser.userFirstname}
                      onChange={(event) => setQuickUser((current) => ({ ...current, userFirstname: event.target.value }))}
                      placeholder="First name *"
                      className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                    />
                    <input
                      value={quickUser.userLastname}
                      onChange={(event) => setQuickUser((current) => ({ ...current, userLastname: event.target.value }))}
                      placeholder="Last name"
                      className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                    />
                    <input
                      value={quickUser.userEmail}
                      onChange={(event) => setQuickUser((current) => ({ ...current, userEmail: event.target.value }))}
                      placeholder="Email *"
                      type="email"
                      className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                    />
                    <input
                      value={quickUser.phone}
                      onChange={(event) => setQuickUser((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="Phone / WhatsApp"
                      className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                    />
                    <input
                      value={quickUser.businessName}
                      onChange={(event) => setQuickUser((current) => ({ ...current, businessName: event.target.value }))}
                      placeholder="Business name"
                      className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                    />
                    <input
                      value={quickUser.country}
                      onChange={(event) => setQuickUser((current) => ({ ...current, country: event.target.value }))}
                      placeholder="Customer country"
                      className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                    />
                    <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground md:col-span-2">
                      <input
                        type="checkbox"
                        checked={quickUser.sendSetupLink}
                        onChange={(event) => setQuickUser((current) => ({ ...current, sendSetupLink: event.target.checked }))}
                        className="rounded border-input text-primary"
                      />
                      Send password setup email
                    </label>
                  </div>
                )}
              </section>

              <section className="grid gap-4 rounded-lg border border-border bg-background p-4 md:grid-cols-2">
                <input
                  value={shippingForm.shippingName}
                  onChange={(event) => updateShippingForm('shippingName', event.target.value)}
                  placeholder="Shipping name *"
                  className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                />
                <input
                  value={shippingForm.grossWeight}
                  onChange={(event) => updateShippingForm('grossWeight', event.target.value)}
                  placeholder="Gross weight *"
                  className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                />
                <select
                  value={shippingForm.shippingTo}
                  onChange={(event) => updateShippingForm('shippingTo', event.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                >
                  <option value="">Destination *</option>
                  {countries.map((country) => (
                    <option key={country.pidCountry} value={country.pidCountry}>
                      {country.countryName || country.pidCountry}
                    </option>
                  ))}
                </select>
                <select
                  value={shippingForm.shippingPlan}
                  onChange={(event) => updateShippingForm('shippingPlan', event.target.value)}
                  disabled={!shippingForm.shippingTo}
                  className="rounded-md border border-input bg-background px-3 py-2.5 text-sm disabled:opacity-60"
                >
                  <option value="">Shipping plan *</option>
                  {shippingPlans.map((plan) => (
                    <option key={plan.pidShippingPlan} value={plan.pidShippingPlan}>
                      {formatShippingPlanDisplay(plan.shippingPlanName || plan.pidShippingPlan)}
                    </option>
                  ))}
                </select>
                <input
                  value={shippingForm.trackingNumber}
                  onChange={(event) => updateShippingForm('trackingNumber', event.target.value)}
                  placeholder="Tracking number"
                  className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                />
                <input
                  value={shippingForm.expectedShipments}
                  onChange={(event) => updateShippingForm('expectedShipments', event.target.value)}
                  placeholder="Expected shipment / goods type"
                  className="rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                />
                <textarea
                  value={shippingForm.description}
                  onChange={(event) => updateShippingForm('description', event.target.value)}
                  placeholder="Description / handling notes"
                  rows={4}
                  className="rounded-md border border-input bg-background px-3 py-2.5 text-sm md:col-span-2"
                />
                <div className="flex flex-wrap gap-4 md:col-span-2">
                  {[
                    ['wantProductVerification', 'Product verification'],
                    ['wantConsolidation', 'Consolidation'],
                    ['multipleSuppliers', 'Multiple suppliers'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={Boolean(shippingForm[key as keyof ShippingForm])}
                        onChange={(event) => updateShippingForm(key as keyof ShippingForm, event.target.checked)}
                        className="rounded border-input text-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-card px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-border bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Create Request
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
