'use client';

import { useEffect, useState } from 'react';
import { Building2, MapPin, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';

type CompanyContacts = {
  chinaAddress: string;
  chinaContact: string;
  lagosAddress: string;
  lagosContact: string;
};

const emptyContacts: CompanyContacts = {
  chinaAddress: '',
  chinaContact: '',
  lagosAddress: '',
  lagosContact: '',
};

export default function CompanyContactsForm() {
  const [contacts, setContacts] = useState<CompanyContacts>(emptyContacts);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadContacts() {
      setLoading(true);
      try {
        const response = await fetch('/api/company-contacts', {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || 'Failed to load contacts');
        }
        if (mounted && data?.data) {
          setContacts({
            chinaAddress: data.data.chinaAddress || '',
            chinaContact: data.data.chinaContact || '',
            lagosAddress: data.data.lagosAddress || '',
            lagosContact: data.data.lagosContact || '',
          });
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to load company contacts');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadContacts();

    return () => {
      mounted = false;
    };
  }, []);

  const updateField = (field: keyof CompanyContacts, value: string) => {
    setContacts((current) => ({ ...current, [field]: value }));
  };

  const saveContacts = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/company-contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contacts),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to save contacts');
      }
      toast.success('Company contacts updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save contacts');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <ContactCard
          icon={MapPin}
          title="China Address"
          description="Shown in Supplier Intelligence when customers need a Guangzhou delivery address for suppliers."
          value={contacts.chinaAddress}
          onChange={(value) => updateField('chinaAddress', value)}
          rows={5}
          loading={loading}
        />
        <ContactCard
          icon={Building2}
          title="China Contact"
          description="Shown with the China address so suppliers or customers know who to contact."
          value={contacts.chinaContact}
          onChange={(value) => updateField('chinaContact', value)}
          rows={3}
          loading={loading}
        />
        <ContactCard
          icon={MapPin}
          title="Lagos Address"
          description="Shown in customer-facing account areas that need the Nigerian office address."
          value={contacts.lagosAddress}
          onChange={(value) => updateField('lagosAddress', value)}
          rows={5}
          loading={loading}
        />
        <ContactCard
          icon={Building2}
          title="Lagos Contact"
          description="Shown with the Lagos address for local customer support."
          value={contacts.lagosContact}
          onChange={(value) => updateField('lagosContact', value)}
          rows={3}
          loading={loading}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={loading || saving}
          onClick={saveContacts}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save contacts
        </button>
      </div>
    </div>
  );
}

function ContactCard({
  icon: Icon,
  title,
  description,
  value,
  onChange,
  rows,
  loading,
}: {
  icon: typeof MapPin;
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  loading: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-soft">
      <div className="border-b border-border bg-muted/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              {title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>
      <div className="p-5">
        <textarea
          value={value}
          disabled={loading}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          className="w-full resize-none rounded-md border border-input bg-background px-4 py-3 text-sm font-medium leading-relaxed text-foreground outline-none transition focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
      </div>
    </section>
  );
}
