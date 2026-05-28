'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  Save, 
  Building, 
  Contact, 
  FileText, 
  RefreshCw,
  Info
} from 'lucide-react';

export default function InvoiceSettingsForm() {
  const [businessName, setBusinessName] = useState('');
  const [businessContactDetails, setBusinessContactDetails] = useState('');
  const [footerNotes, setFooterNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoicing/settings');
      const data = await res.json();
      if (data?.data) {
        setBusinessName(data.data.businessName || '');
        setBusinessContactDetails(data.data.businessContactDetails || '');
        setFooterNotes(data.data.footerNotes || '');
      }
    } catch (error) {
      toast.error('Failed to sync global settings');
    } finally {
      setLoading(false);
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
      toast.success('Invoice blueprint updated');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* 1. Branding & Identity Section */}
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" /> Corporate Identity
          </h3>
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              Legal Business Name
            </label>
            <input 
              value={businessName} 
              onChange={(e) => setBusinessName(e.target.value)} 
              placeholder="e.g. Sure Imports Limited"
              className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Contact className="w-3 h-3" /> Header Contact Details
            </label>
            <textarea 
              value={businessContactDetails} 
              onChange={(e) => setBusinessContactDetails(e.target.value)} 
              rows={5} 
              placeholder="Address, Phone, Email and Tax IDs..."
              className="w-full px-4 py-3 text-sm border border-input rounded-md bg-background text-foreground font-medium resize-none focus:ring-2 focus:ring-ring" 
            />
            <p className="text-[10px] text-muted-foreground italic">This content appears at the top of generated invoices.</p>
          </div>
        </div>
      </div>

      {/* 2. Global Disclaimers Section */}
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Global Footer & Terms
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              Invoice Footer Notes
            </label>
            <textarea 
              value={footerNotes} 
              onChange={(e) => setFooterNotes(e.target.value)} 
              rows={10} 
              placeholder="Payment instructions, bank details, or return policies..."
              className="w-full px-4 py-3 text-xs border border-input rounded-md bg-background text-foreground leading-relaxed font-medium resize-none focus:ring-2 focus:ring-ring" 
            />
          </div>

          <div className="flex gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-primary uppercase">Configuration Tip</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Changes made here will be captured as a "snapshot" for all future invoices. 
                Existing invoices will maintain the settings they were originally issued with.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Bar */}
      <div className="flex justify-end pt-4">
        <button 
          disabled={saving || loading} 
          onClick={save} 
          className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:grayscale focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Update Global Blueprint
        </button>
      </div>

    </div>
  );
}