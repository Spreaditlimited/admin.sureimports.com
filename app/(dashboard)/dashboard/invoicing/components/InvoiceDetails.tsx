'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  FileText, 
  Send, 
  Eye, 
  CreditCard, 
  History, 
  Receipt, 
  Calculator, 
  User,
  RefreshCw,
  PlusCircle,
  Mail
} from 'lucide-react';

interface InvoiceData {
  pidInvoice: string;
  invoiceNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  currency: string;
  status: string;
  grandTotal: string;
  amountPaid: string;
  balanceDue: string;
  dueAt: string | null;
  issuedAt: string | null;
  headerSnapshot: string | null;
  footerSnapshot: string | null;
  notes: string | null;
  items: Array<{ pidInvoiceItem: string; description: string; quantity: string; unitPrice: string; lineTotal: string }>;
  payments: Array<{ pidInvoicePayment: string; amount: string; paymentMethod: string; reference: string | null; paidAt: string }>;
  receipts: Array<{ pidReceipt: string; receiptNumber: string; amount: string; deliveryStatus: string }>;
}

export default function InvoiceDetails({ pidInvoice }: { pidInvoice: string }) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/invoicing/invoices/${encodeURIComponent(pidInvoice)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load invoice');
      setData(json?.data || null);
    } catch (e: any) {
      setData(null);
      setError(e?.message || 'Invoice inaccessible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [pidInvoice]);

  const recordPayment = async () => {
    if (!paymentAmount) return toast.error("Enter payment amount");
    setRecording(true);
    try {
      const res = await fetch(`/api/invoicing/invoices/${encodeURIComponent(pidInvoice)}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(paymentAmount), paymentMethod, reference: paymentRef || null }),
      });
      if (!res.ok) throw new Error('Failed to record payment');
      setPaymentAmount('');
      setPaymentRef('');
      toast.success("Payment recorded successfully");
      await fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRecording(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    let style = 'bg-muted text-muted-foreground border-border';
    if (s === 'PAID') style = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (s === 'PARTIAL') style = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (s === 'DRAFT') style = 'bg-muted text-muted-foreground border-border';
    if (s === 'OVERDUE') style = 'bg-destructive/10 text-destructive border-destructive/20';

    return (
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style}`}>
        {status}
      </span>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 bg-card border border-border rounded-xl">
        <RefreshCw className="w-8 h-8 text-muted-foreground/40 animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Syncing invoice ledger...</p>
    </div>
  );

  if (error || !data) return (
    <div className="p-10 text-center bg-destructive/5 border border-destructive/20 rounded-xl text-destructive font-bold">
      {error || 'The requested invoice could not be found.'}
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. Hero Summary Card */}
      <div className="bg-card border border-border shadow-soft rounded-xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{data.invoiceNumber}</h2>
                    {getStatusBadge(data.status)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <User className="w-4 h-4" />
                    <span>{data.customerName || 'N/A'}</span>
                    <span className="opacity-30">•</span>
                    <span className="font-mono text-xs">{data.customerEmail}</span>
                </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:text-right">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Grand Total</span>
                    <span className="text-lg font-bold text-foreground">{data.currency} {Number(data.grandTotal).toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Paid</span>
                    <span className="text-lg font-bold text-emerald-600">{data.currency} {Number(data.amountPaid).toLocaleString()}</span>
                </div>
                <div className="flex flex-col col-span-2 sm:col-span-1 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Balance Due</span>
                    <span className="text-xl font-bold text-primary">{data.currency} {Number(data.balanceDue).toLocaleString()}</span>
                </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-card flex flex-wrap items-center gap-3">
          <Link
            href={`/dashboard/invoicing/${pidInvoice}/preview`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md text-xs font-bold hover:bg-muted transition-all shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" /> Preview Document
          </Link>
          
          {data.status === 'DRAFT' ? (
            <button 
                disabled={issuing} 
                onClick={() => {}} 
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" /> Issue Invoice
            </button>
          ) : (
            <button
                disabled={sendingInvoice}
                onClick={() => {}}
                className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md text-xs font-bold hover:bg-muted transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" /> {sendingInvoice ? 'Sending...' : 'Dispatch Email'}
            </button>
          )}
        </div>
      </div>

      {/* 2. Line Items Table */}
      <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-muted-foreground" /> Line Items
            </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4 text-right">Unit Price</th>
                    <th className="px-6 py-4 text-right">Line Total</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((it) => (
                <tr key={it.pidInvoiceItem} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium">{it.description}</td>
                  <td className="px-6 py-4 text-center font-bold text-muted-foreground">{Number(it.quantity).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs">{data.currency} {Number(it.unitPrice).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-bold font-mono text-xs">{data.currency} {Number(it.lineTotal).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* 3. Record Payment Form */}
        <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-border bg-muted/20">
             <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-primary" /> Record Payment
             </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Amount ({data.currency})</label>
                <input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} type="number" placeholder="0.00" className="w-full px-4 py-2.5 border border-input rounded-md bg-background text-sm font-bold focus:ring-2 focus:ring-ring" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2.5 border border-input rounded-md bg-background text-sm font-medium focus:ring-2 focus:ring-ring">
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CASH">Cash</option>
                        <option value="POS">POS</option>
                        <option value="CARD">Card</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reference</label>
                    <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Tx Ref" className="w-full px-4 py-2.5 border border-input rounded-md bg-background text-sm font-mono focus:ring-2 focus:ring-ring" />
                </div>
            </div>

            <button 
                disabled={recording} 
                onClick={recordPayment} 
                className="w-full py-3 bg-primary text-primary-foreground rounded-md text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {recording ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Save Transaction
            </button>
          </div>
        </div>

        {/* 4. Payment History */}
        <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/20">
             <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" /> Payment Ledger
             </h3>
          </div>
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {data.payments.length === 0 ? (
                <div className="p-10 text-center text-sm font-medium text-muted-foreground">No payments recorded for this invoice.</div>
            ) : data.payments.map((p) => (
              <div key={p.pidInvoicePayment} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{data.currency} {Number(p.amount).toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-tighter bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">{p.paymentMethod}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium">
                        {new Date(p.paidAt).toLocaleDateString()} • Ref: <span className="font-mono">{p.reference || 'N/A'}</span>
                    </p>
                </div>
                <button className="p-2 hover:bg-muted rounded text-muted-foreground"><Receipt className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Receipts Section */}
      <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-muted-foreground" /> Dispatched Receipts
            </h3>
        </div>
        <div className="divide-y divide-border">
          {data.receipts.length === 0 ? (
             <div className="p-10 text-center text-sm font-medium text-muted-foreground italic">No official receipts generated yet.</div>
          ) : data.receipts.map((r) => (
            <div key={r.pidReceipt} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-background border border-border rounded shadow-sm">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{r.receiptNumber}</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                        Amount: {data.currency} {Number(r.amount).toLocaleString()} • <span className="text-emerald-600">{r.deliveryStatus}</span>
                    </span>
                </div>
              </div>
              <button 
                onClick={() => {}} 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md text-xs font-bold hover:bg-muted transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> Re-send Receipt
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Legal & Context Snapshots */}
      <div className="grid lg:grid-cols-2 gap-6 pb-10">
        <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Header Snapshot</h3>
            <div className="p-4 bg-muted/30 border border-border rounded-lg">
                <pre className="text-xs font-sans whitespace-pre-wrap text-foreground leading-relaxed">{data.headerSnapshot || 'N/A'}</pre>
            </div>
        </div>
        <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Footer Snapshot</h3>
            <div className="p-4 bg-muted/30 border border-border rounded-lg">
                <pre className="text-xs font-sans whitespace-pre-wrap text-foreground leading-relaxed">{data.footerSnapshot || 'N/A'}</pre>
            </div>
        </div>
      </div>

    </div>
  );
}
