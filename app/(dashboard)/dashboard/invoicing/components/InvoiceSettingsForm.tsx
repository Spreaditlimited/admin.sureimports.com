'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function InvoiceSettingsForm() {
  const [businessName, setBusinessName] = useState('');
  const [businessContactDetails, setBusinessContactDetails] = useState('');
  const [footerNotes, setFooterNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    const res = await fetch('/api/invoicing/settings');
    const data = await res.json();
    if (data?.data) {
      setBusinessName(data.data.businessName || '');
      setBusinessContactDetails(data.data.businessContactDetails || '');
      setFooterNotes(data.data.footerNotes || '');
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/invoicing/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, businessContactDetails, footerNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to save settings');
      toast.success('Invoice settings updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border p-4 bg-white dark:bg-gray-800 space-y-4">
      <label className="block text-sm">Business Name
        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
      </label>
      <label className="block text-sm">Business Contact Details
        <textarea value={businessContactDetails} onChange={(e) => setBusinessContactDetails(e.target.value)} rows={7} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
      </label>
      <label className="block text-sm">Footer Notes
        <textarea value={footerNotes} onChange={(e) => setFooterNotes(e.target.value)} rows={12} className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
      </label>
      <button disabled={saving} onClick={save} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Save Settings</button>
    </div>
  );
}
