'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

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
      if (matched.length > 0) {
        setSelectedCustomer(matched[0]);
      }
      setCustomerSearch(gift.contactEmail || gift.businessName || '');
      setNotes((prev) => {
        const prefix = `Corporate Gift Request: ${gift.pidRequest}\nBusiness: ${gift.businessName}\nContact: ${gift.contactPersonFullName}\nEmail: ${gift.contactEmail}\nWhatsApp: ${gift.whatsappNumber}\nExpected Delivery: ${gift.expectedDeliveryDate}\nLocation: ${gift.finalDeliveryLocationNigeria}\n`;
        return prev ? `${prefix}\n${prev}` : prefix;
      });
      setItems([
        {
          description: `${gift.productOrItemNeeded} (${gift.preferredQualityLevel})`,
          quantity: Number(gift.quantityNeeded || 1),
          unitPrice: 0,
        },
      ]);
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
      setCustomers((prev) => [created, ...prev.filter((x) => x.pidUser !== created.pidUser)]);
      setCustomerSearch(created.userEmail || '');
      setShowQuickAddUser(false);
      setQuickUser({
        userFirstname: '',
        userLastname: '',
        userEmail: '',
        phone: '',
        country: 'Nigeria',
        sendSetupLink: true,
      });
      if (json?.statusx === 'EXISTS') {
        toast.success(
          json?.setupLinkSent
            ? 'Existing user selected. Password setup link sent.'
            : 'Existing user selected. Password setup link was not sent.',
        );
      } else {
        toast.success(
          json?.setupLinkSent
            ? 'User created, selected, and password setup link sent.'
            : 'User created and selected. Password setup link was not sent.',
        );
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
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
    if (!selectedCustomer) return toast.error('Select a registered user first');
    if (!items.length || items.some((i) => !i.description || i.quantity <= 0)) return toast.error('Add valid line items');

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
      if (!createRes.ok || !created?.data?.pidInvoice) {
        throw new Error(created?.message || 'Failed to create invoice');
      }

      const pidInvoice = created.data.pidInvoice;
      if (issueNow) {
        const issueRes = await fetch(`/api/invoicing/invoices/${pidInvoice}/issue`, { method: 'POST' });
        if (!issueRes.ok) {
          const x = await issueRes.json();
          throw new Error(x?.message || 'Failed to issue invoice');
        }
      }

      router.push(`/dashboard/invoicing/${pidInvoice}`);
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-3">1. Select Registered User</h3>
        <div className="flex gap-2">
          <input
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search name or email"
            className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
          />
          <button onClick={searchCustomers} className="px-4 py-2 rounded-lg bg-gray-900 text-white">Search</button>
          <button
            type="button"
            onClick={() => setShowQuickAddUser((prev) => !prev)}
            className="px-4 py-2 rounded-lg border"
          >
            {showQuickAddUser ? 'Close Quick Add' : 'Quick Add User'}
          </button>
        </div>
        {showQuickAddUser && (
          <div className="mt-3 rounded-lg border p-3 space-y-3 bg-gray-50 dark:bg-gray-900/30">
            <p className="text-sm font-medium">Create user in standard user system</p>
            <div className="grid md:grid-cols-2 gap-2">
              <input
                value={quickUser.userFirstname}
                onChange={(e) => setQuickUser((prev) => ({ ...prev, userFirstname: e.target.value }))}
                placeholder="First name *"
                className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
              />
              <input
                value={quickUser.userLastname}
                onChange={(e) => setQuickUser((prev) => ({ ...prev, userLastname: e.target.value }))}
                placeholder="Last name"
                className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
              />
              <input
                type="email"
                value={quickUser.userEmail}
                onChange={(e) => setQuickUser((prev) => ({ ...prev, userEmail: e.target.value }))}
                placeholder="Email *"
                className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
              />
              <input
                value={quickUser.phone}
                onChange={(e) => setQuickUser((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone"
                className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700"
              />
              <input
                value={quickUser.country}
                onChange={(e) => setQuickUser((prev) => ({ ...prev, country: e.target.value }))}
                placeholder="Country"
                className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 md:col-span-2"
              />
              <label className="md:col-span-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={quickUser.sendSetupLink}
                  onChange={(e) =>
                    setQuickUser((prev) => ({ ...prev, sendSetupLink: e.target.checked }))
                  }
                />
                Send password setup link now
              </label>
            </div>
            <button
              type="button"
              disabled={quickUserSaving}
              onClick={createQuickUser}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
            >
              {quickUserSaving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        )}
        <div className="mt-3 max-h-48 overflow-auto border rounded-lg">
          {customers.map((c) => (
            <button
              key={c.pidUser}
              onClick={() => setSelectedCustomer(c)}
              className={`w-full text-left px-3 py-2 border-b hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedCustomer?.pidUser === c.pidUser ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
            >
              <p className="font-medium">{`${c.userFirstname || ''} ${c.userLastname || ''}`.trim() || 'Unnamed User'}</p>
              <p className="text-xs text-gray-500">{c.userEmail} • {c.pidUser}</p>
            </button>
          ))}
          {!customers.length && <p className="px-3 py-3 text-sm text-gray-500">No search results yet.</p>}
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800 space-y-3">
        <h3 className="font-semibold">2. Invoice Details</h3>
        <label className="block text-sm">Due Date
          <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </label>
        <label className="block text-sm">Header Snapshot
          <textarea value={headerSnapshot} onChange={(e) => setHeaderSnapshot(e.target.value)} rows={5} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </label>
        <label className="block text-sm">Footer Snapshot
          <textarea value={footerSnapshot} onChange={(e) => setFooterSnapshot(e.target.value)} rows={7} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </label>
        <label className="block text-sm">Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </label>
      </div>

      <div className="rounded-xl border p-4 bg-white dark:bg-gray-800 space-y-3">
        <h3 className="font-semibold">3. Line Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="text-left p-2">Description</th><th className="text-left p-2">Qty</th><th className="text-left p-2">Unit Price</th><th className="text-right p-2">Line Total</th></tr></thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2"><input value={row.description} onChange={(e) => setRow(i, 'description', e.target.value)} className="w-full px-2 py-1 border rounded bg-white dark:bg-gray-700" /></td>
                  <td className="p-2"><input type="number" min="1" value={row.quantity} onChange={(e) => setRow(i, 'quantity', e.target.value)} className="w-24 px-2 py-1 border rounded bg-white dark:bg-gray-700" /></td>
                  <td className="p-2"><input type="number" min="0" value={row.unitPrice} onChange={(e) => setRow(i, 'unitPrice', e.target.value)} className="w-32 px-2 py-1 border rounded bg-white dark:bg-gray-700" /></td>
                  <td className="p-2 text-right">₦{(row.quantity * row.unitPrice).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }])} className="px-3 py-1.5 border rounded-lg">Add Row</button>
          <button onClick={() => setItems((prev) => prev.length > 1 ? prev.slice(0, -1) : prev)} className="px-3 py-1.5 border rounded-lg">Remove Last</button>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm">Discount
            <input type="number" min="0" value={discountTotal} onChange={(e) => setDiscountTotal(Number(e.target.value || 0))} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
          </label>
          <label className="text-sm">Tax
            <input type="number" min="0" value={taxTotal} onChange={(e) => setTaxTotal(Number(e.target.value || 0))} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
          </label>
          <div className="text-sm">
            <p className="text-gray-500 mt-1">Subtotal: ₦{subtotal.toLocaleString()}</p>
            <p className="text-gray-500">Grand Total: ₦{grandTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button disabled={saving} onClick={() => createInvoice(false)} className="px-4 py-2 rounded-lg border">Save Draft</button>
        <button disabled={saving} onClick={() => createInvoice(true)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Issue Invoice</button>
      </div>
    </div>
  );
}
