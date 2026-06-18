'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type WhatsAppContact = {
  pidContact: string;
  label: string;
  description: string;
  phone: string;
  messageId: string;
  defaultMessage: string;
  isActive: boolean;
};

type ApiContact = {
  pidContact?: unknown;
  label?: unknown;
  description?: unknown;
  phone?: unknown;
  messageId?: unknown;
  defaultMessage?: unknown;
  isActive?: unknown;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const emptyContact = (): WhatsAppContact => ({
  pidContact: `WAC-${Date.now()}`,
  label: '',
  description: '',
  phone: '',
  messageId: '',
  defaultMessage: '',
  isActive: true,
});

export default function AdminWhatsAppForm() {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load contacts');
      const rows: ApiContact[] = Array.isArray(data?.data) ? data.data : [];
      setContacts(
        rows.length
          ? rows.map((row) => ({
              pidContact: String(row.pidContact || `WAC-${Date.now()}`),
              label: String(row.label || ''),
              description: String(row.description || ''),
              phone: String(row.phone || ''),
              messageId: String(row.messageId || ''),
              defaultMessage: String(row.defaultMessage || ''),
              isActive: row.isActive !== false && row.isActive !== 0,
            }))
          : [emptyContact()],
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load contacts'));
      setContacts([emptyContact()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const updateContact = (
    index: number,
    field: keyof WhatsAppContact,
    value: string | boolean,
  ) => {
    setContacts((current) =>
      current.map((contact, idx) =>
        idx === index ? { ...contact, [field]: value } : contact,
      ),
    );
  };

  const removeContact = (index: number) => {
    setContacts((current) => {
      const next = current.filter((_, idx) => idx !== index);
      return next.length ? next : [emptyContact()];
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to save contacts');
      toast.success('WhatsApp contacts updated');
      await fetchContacts();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save contacts'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              WhatsApp Contacts
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Use international phone format without plus signs, for example 2348012345678.
            </p>
          </div>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="space-y-4 p-6">
          {contacts.map((contact, index) => (
            <div
              key={`${contact.pidContact}-${index}`}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Contact {index + 1}
                </p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={contact.isActive}
                      onChange={(event) => updateContact(index, 'isActive', event.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                    aria-label="Remove WhatsApp contact"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Label
                  </span>
                  <input
                    value={contact.label}
                    onChange={(event) => updateContact(index, 'label', event.target.value)}
                    placeholder="General Enquiries"
                    className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-ring"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Phone Number
                  </span>
                  <input
                    value={contact.phone}
                    onChange={(event) => updateContact(index, 'phone', event.target.value)}
                    placeholder="2348012345678"
                    className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-ring"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Description
                  </span>
                  <input
                    value={contact.description}
                    onChange={(event) => updateContact(index, 'description', event.target.value)}
                    placeholder="Sales, sourcing, shipping, and support"
                    className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-ring"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    WhatsApp Message ID
                  </span>
                  <input
                    value={contact.messageId}
                    onChange={(event) => updateContact(index, 'messageId', event.target.value)}
                    placeholder="Optional legacy wa.me/message ID"
                    className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-ring"
                  />
                </label>
              </div>

              <label className="mt-4 block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Default Message
                </span>
                <textarea
                  value={contact.defaultMessage}
                  onChange={(event) => updateContact(index, 'defaultMessage', event.target.value)}
                  rows={3}
                  placeholder="Leave empty to use the page-specific message."
                  className="w-full resize-none rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setContacts((current) => [...current, emptyContact()])}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            Add WhatsApp Contact
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving || loading}
          onClick={save}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save WhatsApp Contacts
        </button>
      </div>
    </div>
  );
}
