'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Receipt, 
  User, 
  Calendar, 
  Landmark, 
  RefreshCw, 
  History 
} from 'lucide-react';

export default function InvoicePaymentClaimsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoicing/payment-claims');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load claims');
      setItems(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      toast.error('Failed to sync payment claims');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (pidClaim: string) => {
    try {
      const res = await fetch(`/api/invoicing/payment-claims/${encodeURIComponent(pidClaim)}/approve`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.message || 'Approval failed');
      }
      toast.success('Payment claim verified successfully');
      load();
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const reject = async (pidClaim: string) => {
    try {
      const res = await fetch(`/api/invoicing/payment-claims/${encodeURIComponent(pidClaim)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.message || 'Rejection failed');
      }
      toast.success('Claim has been rejected');
      load();
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const formatCurrency = (amount: any, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
    }).format(Number(amount) || 0);
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || 'UNKNOWN';
    let style = 'bg-muted text-muted-foreground border-border';
    
    if (s === 'APPROVED') style = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (s === 'REJECTED') style = 'bg-destructive/10 text-destructive border-destructive/20';
    if (s.includes('PENDING')) style = 'bg-amber-500/10 text-amber-600 border-amber-500/20';

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style}`}>
        {s.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Payment Claims</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Audit and verify manual payment submissions from customers.</p>
        </div>
        <button 
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border rounded-md hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          <span className="text-xs font-bold text-foreground uppercase tracking-tight">Sync Claims</span>
        </button>
      </div>

      {/* 2. Claims Content */}
      <div className="space-y-4">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-card border border-border rounded-xl">
             <RefreshCw className="w-8 h-8 text-muted-foreground/40 animate-spin mb-4" />
             <p className="text-sm font-medium text-muted-foreground">Checking for new claims...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 bg-card border border-dashed border-border rounded-xl text-center">
             <div className="p-4 bg-muted rounded-full mb-4 text-muted-foreground/30">
                <History className="w-8 h-8" />
             </div>
             <p className="text-sm font-medium text-muted-foreground">All clear</p>
             <p className="text-xs text-muted-foreground/60 mt-1">No pending payment claims require attention.</p>
          </div>
        ) : (
          items.map((it, index) => (
            <div
              key={String(it.pidClaim || `claim-${index}`)}
              className="bg-card border border-border shadow-soft rounded-lg overflow-hidden flex flex-col md:flex-row"
            >
              {/* Left Side: Main Info */}
              <div className="flex-1 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded text-primary">
                        <Receipt className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-sm font-bold text-foreground">
                        {it.invoice?.invoiceNumber || 'INV-000000'}
                    </span>
                  </div>
                  {getStatusBadge(it.status)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Submitted By</span>
                            <span className="text-sm font-semibold text-foreground">
                                {it.invoice?.customerName || it.invoice?.customerEmail || 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Claim Date</span>
                            <span className="text-sm font-medium text-foreground">
                                {it.claimedAt ? new Date(it.claimedAt).toLocaleString() : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
                   <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Claimed Amount</span>
                        <span className="text-xl font-bold text-foreground">
                            {formatCurrency(it.claimedAmount, it.currency)}
                        </span>
                   </div>
                   <div className="flex flex-col sm:items-end">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Reference</span>
                        <span className="text-sm font-mono font-bold text-primary">{it.paymentReference || 'NO REFERENCE'}</span>
                   </div>
                </div>
              </div>

              {/* Right Side: Bank Meta & Actions */}
              <div className="w-full md:w-80 bg-muted/30 border-t md:border-t-0 md:border-l border-border p-5 sm:p-6 flex flex-col justify-between gap-6">
                
                {/* Bank Account Details Parser */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Landmark className="w-3 h-3" /> Target Bank Account
                    </h4>
                    <div className="text-xs space-y-1 text-foreground font-medium">
                        {(() => {
                            try {
                                const bank = it.selectedBankAccountJson ? JSON.parse(it.selectedBankAccountJson) : null;
                                if (!bank) return <span className="text-muted-foreground italic">System Account: {it.selectedBankAccountId || 'Default'}</span>;
                                return (
                                    <>
                                        <p className="font-bold">{bank.accountName}</p>
                                        <p className="text-muted-foreground">{bank.bankName}</p>
                                        <p className="font-mono text-[11px] tracking-widest bg-muted px-1.5 py-0.5 rounded w-fit">{bank.accountNumber}</p>
                                    </>
                                );
                            } catch {
                                return <span className="text-muted-foreground italic break-all">ID: {it.selectedBankAccountId}</span>;
                            }
                        })()}
                    </div>
                </div>

                {/* Verification Actions */}
                {it.status === 'PENDING_CONFIRMATION' && (
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => approve(it.pidClaim)}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-md text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                        >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                            onClick={() => reject(it.pidClaim)}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-background border border-border text-destructive rounded-md text-xs font-bold hover:bg-destructive/5 transition-all shadow-sm"
                        >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                    </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}