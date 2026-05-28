'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  Search, 
  Mail, 
  RefreshCw, 
  Receipt as ReceiptIcon, 
  Calendar, 
  FileText,
  User
} from 'lucide-react';

interface Receipt {
  pidReceipt: string;
  receiptNumber: string;
  pidInvoice: string;
  amount: string;
  issuedAt: string;
  deliveryStatus: string;
  invoice: {
    invoiceNumber: string;
    customerName: string | null;
    customerEmail: string | null;
    currency: string;
  };
}

export default function ReceiptsTable() {
  const [items, setItems] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/invoicing/receipts?${params.toString()}`);
      const json = await res.json();
      setItems(json.data || []);
    } catch (error) {
      toast.error("Failed to sync receipts ledger");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendReceipt = async (pidReceipt: string) => {
    try {
      const res = await fetch(`/api/invoicing/receipts/${pidReceipt}/send`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to send');
      
      toast.success('Receipt dispatched via email');
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || 'PENDING';
    let style = 'bg-muted text-muted-foreground border-border';
    
    if (s === 'SENT' || s === 'DELIVERED') style = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (s === 'FAILED') style = 'bg-destructive/10 text-destructive border-destructive/20';

    return (
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Control Bar */}
      <div className="bg-card border border-border p-4 rounded-lg shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-2xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt #, invoice #, or customer..."
            className="w-full pl-9 pr-4 py-2 border border-input rounded-md bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={fetchData} 
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md text-sm font-bold hover:bg-muted transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Ledger
          </button>
        </div>
      </div>

      {/* 2. Main Data Table */}
      <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Receipt Details</th>
                <th className="px-6 py-4">Linked Invoice</th>
                <th className="px-6 py-4">Customer Account</th>
                <th className="px-6 py-4 text-right">Settled Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-border bg-card">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <RefreshCw className="w-8 h-8 text-muted-foreground/40 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Syncing receipts...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <ReceiptIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No receipts found in the archive.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.pidReceipt} className="hover:bg-muted/30 transition-colors">
                    
                    {/* Receipt Identification */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {item.receiptNumber}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                           <Calendar className="w-3 h-3" />
                           {new Date(item.issuedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>

                    {/* Linked Invoice */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-primary/60" />
                        <span className="text-sm font-semibold text-foreground">
                           {item.invoice?.invoiceNumber || item.pidInvoice}
                        </span>
                      </div>
                    </td>

                    {/* Customer Account */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                           <User className="w-3.5 h-3.5 text-muted-foreground" />
                           {item.invoice?.customerName || 'N/A'}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                           {item.invoice?.customerEmail || 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* Settlement Amount */}
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono font-bold text-foreground">
                        {item.invoice?.currency || 'NGN'} {Number(item.amount).toLocaleString()}
                      </span>
                    </td>

                    {/* Delivery Status */}
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(item.deliveryStatus)}
                    </td>

                    {/* Action Button */}
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => sendReceipt(item.pidReceipt)} 
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-background border border-border hover:bg-muted text-primary rounded-md text-xs font-bold transition-all shadow-sm"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Dispatch
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}