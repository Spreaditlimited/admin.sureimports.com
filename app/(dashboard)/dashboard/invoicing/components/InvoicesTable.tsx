'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { 
  Eye, 
  Plus, 
  Search, 
  RefreshCw, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
  pidInvoice: string;
  invoiceNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  currency: string;
  grandTotal: string;
  amountPaid: string;
  balanceDue: string;
  status: string;
  createdAt: string;
  dueAt: string | null;
}

export default function InvoicesTable() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const res = await fetch(`/api/invoicing/invoices?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to fetch invoices');
      setItems(data.data || []);
    } catch (e: any) {
      setItems([]);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        acc.total += Number(it.grandTotal || 0);
        acc.paid += Number(it.amountPaid || 0);
        acc.balance += Number(it.balanceDue || 0);
        return acc;
      },
      { total: 0, paid: 0, balance: 0 },
    );
  }, [items]);

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || 'DRAFT';
    let style = 'bg-muted text-muted-foreground border-border';
    
    if (s === 'PAID') style = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (s === 'PARTIALLY_PAID' || s === 'ISSUED') style = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (s === 'OVERDUE') style = 'bg-destructive/10 text-destructive border-destructive/20';
    if (s === 'CANCELLED') style = 'bg-muted text-muted-foreground border-border opacity-50';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style}`}>
        {s.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Receivables</p>
          <p className="text-2xl font-bold text-foreground">₦{totals.total.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1 flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3" /> Total Collected
          </p>
          <p className="text-2xl font-bold text-foreground">₦{totals.paid.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Total Outstanding
          </p>
          <p className="text-2xl font-bold text-foreground">₦{totals.balance.toLocaleString()}</p>
        </div>
      </div>

      {/* 2. Control Bar */}
      <div className="bg-card border border-border p-4 rounded-lg shadow-sm flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:max-w-3xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, customer or email..."
              className="w-full pl-9 pr-4 py-2 border border-input rounded-md bg-background text-sm text-foreground focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm text-foreground font-medium focus:ring-2 focus:ring-ring"
          >
            <option value="">Filter Status</option>
            <option value="DRAFT">Draft</option>
            <option value="ISSUED">Issued</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          <button 
            onClick={fetchInvoices} 
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md text-sm font-bold hover:bg-muted transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Apply
          </button>
        </div>
        
        <Link 
          href="/dashboard/invoicing/create" 
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </Link>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        {error && (
            <div className="px-6 py-3 bg-destructive/10 border-b border-destructive/20 text-xs font-bold text-destructive uppercase tracking-wide">
                Error: {error}
            </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Invoice Details</th>
                <th className="px-6 py-4">Customer Account</th>
                <th className="px-6 py-4">Payment Status</th>
                <th className="px-6 py-4 text-right">Ledger Totals</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-border bg-card">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <RefreshCw className="w-8 h-8 text-muted-foreground/40 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Syncing invoice ledger...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No invoices found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.pidInvoice} className="hover:bg-muted/30 transition-colors">
                    
                    {/* Invoice Info */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {item.invoiceNumber}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                          Created {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    {/* Customer Info */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground text-sm">
                            {item.customerName || 'Direct Sale'}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                            {item.customerEmail || 'No Email Linked'}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Amounts Ledger */}
                    <td className="px-6 py-4">
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Total</span>
                                <span className="font-bold text-foreground font-mono">
                                    {item.currency} {Number(item.grandTotal).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Paid</span>
                                <span className="font-bold text-emerald-600 font-mono">
                                    {item.currency} {Number(item.amountPaid).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 pt-1 border-t border-border">
                                <span className="text-[10px] font-bold text-primary uppercase">Due</span>
                                <span className="font-bold text-primary font-mono">
                                    {item.currency} {Number(item.balanceDue).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/dashboard/invoicing/${item.pidInvoice}`} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border hover:bg-muted text-primary rounded-md text-xs font-bold transition-all shadow-sm focus:ring-2 focus:ring-ring"
                      >
                        <Eye className="w-3.5 h-3.5" /> 
                        Manage
                      </Link>
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