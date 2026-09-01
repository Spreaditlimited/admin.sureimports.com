'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  FileText, 
  Send, 
  Eye, 
  Pencil,
  CreditCard, 
  History, 
  Receipt, 
  Calculator, 
  User,
  RefreshCw,
  PlusCircle,
  Mail,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

interface PaymentClaim {
  pidClaim: string;
  claimedAmount: string;
  currency: string;
  paymentReference: string | null;
  note: string | null;
  claimedAt: string;
  status: string;
}

interface InvoiceData {
  pidInvoice: string;
  invoiceNumber: string;
  customerName: string | null;
  customerBusinessName: string | null;
  customerContactName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  currency: string;
  status: string;
  grandTotal: string;
  amountPaid: string;
  balanceDue: string;
  dueAt: string | null;
  issuedAt: string | null;
  headerSnapshot: string | null;
  footerSnapshot: string | null;
  customerNotes: string | null;
  notes: string | null;
  quotation: { pidQuotation: string; quotationNumber: string; customerName: string; status: string } | null;
  items: Array<{ pidInvoiceItem: string; description: string; quantity: string; unitPrice: string; lineTotal: string }>;
  payments: Array<{ pidInvoicePayment: string; amount: string; paymentMethod: string; reference: string | null; paidAt: string }>;
  paymentClaims: PaymentClaim[];
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
  const [claimPromptOpen, setClaimPromptOpen] = useState(false);
  const [confirmingClaimPid, setConfirmingClaimPid] = useState('');

  const pendingClaims = data?.paymentClaims || [];

  useEffect(() => {
    if (!claimPromptOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !recording && !confirmingClaimPid) {
        setClaimPromptOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [claimPromptOpen, confirmingClaimPid, recording]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/invoicing/invoices/${encodeURIComponent(pidInvoice)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load invoice');
      setData(json?.data || null);
    } catch (e: unknown) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Invoice inaccessible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [pidInvoice]);

  const issueInvoice = async () => {
    setIssuing(true);
    try {
      const res = await fetch(`/api/invoicing/invoices/${encodeURIComponent(pidInvoice)}/issue`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to issue invoice');
      toast.success('Invoice issued successfully');
      await fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to issue invoice');
    } finally {
      setIssuing(false);
    }
  };

  const dispatchInvoice = async () => {
    setSendingInvoice(true);
    try {
      const res = await fetch(`/api/invoicing/invoices/${encodeURIComponent(pidInvoice)}/send`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to send invoice');
      toast.success('Invoice email sent successfully');
      await fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to send invoice');
    } finally {
      setSendingInvoice(false);
    }
  };

  const submitManualPayment = async (ignorePendingClaims = false) => {
    setRecording(true);
    try {
      const res = await fetch(`/api/invoicing/invoices/${encodeURIComponent(pidInvoice)}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(paymentAmount),
          paymentMethod,
          reference: paymentRef || null,
          ignorePendingClaims,
        }),
      });
      const json = await res.json();
      if (res.status === 409 && json?.code === 'PENDING_PAYMENT_CLAIM') {
        setData((current) => current
          ? { ...current, paymentClaims: json?.data?.paymentClaims || current.paymentClaims }
          : current);
        setClaimPromptOpen(true);
        return;
      }
      if (!res.ok) throw new Error(json?.message || 'Failed to record payment');
      setPaymentAmount('');
      setPaymentRef('');
      setClaimPromptOpen(false);
      toast.success(
        json?.data?.approvedPaymentClaimPid
          ? 'Payment recorded and matching claim approved'
          : 'Payment recorded successfully',
      );
      await fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to record payment');
    } finally {
      setRecording(false);
    }
  };

  const recordPayment = async () => {
    if (pendingClaims.length > 0) {
      setClaimPromptOpen(true);
      return;
    }
    if (!paymentAmount) return toast.error('Enter payment amount');
    await submitManualPayment();
  };

  const confirmPaymentClaim = async (pidClaim: string) => {
    setConfirmingClaimPid(pidClaim);
    try {
      const res = await fetch(
        `/api/invoicing/payment-claims/${encodeURIComponent(pidClaim)}/approve`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to confirm payment claim');
      setPaymentAmount('');
      setPaymentRef('');
      setClaimPromptOpen(false);
      toast.success('Payment claim confirmed and payment recorded');
      await fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to confirm payment claim');
    } finally {
      setConfirmingClaimPid('');
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    let style = 'bg-muted text-muted-foreground border-border';
    if (s === 'PAID') style = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (s === 'PARTIAL' || s === 'PARTIALLY_PAID') style = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
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

  const canEditInvoice = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(
    String(data.status || '').toUpperCase(),
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
                {data.customerBusinessName && data.customerContactName ? (
                  <p className="text-xs text-muted-foreground">Contact person: {data.customerContactName}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">{[data.customerPhone, data.customerAddress].filter(Boolean).join(' • ')}</p>
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
          <a
            href={`/api/invoicing/invoices/${encodeURIComponent(pidInvoice)}/pdf`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md text-xs font-bold hover:bg-muted transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </a>
          {data.quotation ? (
            <a
              href={`/api/invoicing/quotation-builder/${encodeURIComponent(data.quotation.pidQuotation)}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md text-xs font-bold hover:bg-muted transition-all shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" /> Quotation {data.quotation.quotationNumber}
            </a>
          ) : null}
          
          {data.status === 'DRAFT' ? (
            <>
              <Link
                href={`/dashboard/invoicing/${pidInvoice}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md text-xs font-bold hover:bg-muted transition-all shadow-sm"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Invoice
              </Link>
              <button 
                  disabled={issuing} 
                  onClick={issueInvoice}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
              >
                {issuing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} Issue Invoice
              </button>
            </>
          ) : (
            <>
              {canEditInvoice ? (
                <Link
                  href={`/dashboard/invoicing/${pidInvoice}/edit`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md text-xs font-bold hover:bg-muted transition-all shadow-sm"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Invoice
                </Link>
              ) : null}
              <button
                disabled={sendingInvoice}
                onClick={dispatchInvoice}
                className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border text-foreground rounded-md text-xs font-bold hover:bg-muted transition-all shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> {sendingInvoice ? 'Sending PDF...' : 'Email PDF to Customer'}
              </button>
            </>
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
            {pendingClaims.length > 0 ? (
              <button
                type="button"
                onClick={() => setClaimPromptOpen(true)}
                className="flex w-full items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-foreground">
                    {pendingClaims.length === 1 ? 'Payment claim awaiting confirmation' : `${pendingClaims.length} payment claims awaiting confirmation`}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    Review the customer&apos;s claim before recording another payment for this invoice.
                  </span>
                </span>
              </button>
            ) : null}
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
              {pendingClaims.length > 0 ? 'Review Payment Claim' : 'Save Transaction'}
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
      {(data.customerNotes || data.notes) && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Customer-visible notes</h3>
            <div className="p-4 bg-card border border-border rounded-lg whitespace-pre-wrap text-xs text-foreground">{data.customerNotes || 'N/A'}</div>
          </div>
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Private admin notes</h3>
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg whitespace-pre-wrap text-xs text-foreground">{data.notes || 'N/A'}</div>
          </div>
        </div>
      )}
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

      {claimPromptOpen && pendingClaims.length > 0 ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-claim-title"
          aria-describedby="payment-claim-description"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !recording && !confirmingClaimPid) {
              setClaimPromptOpen(false);
            }
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-soft animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4 border-b border-border p-6">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 id="payment-claim-title" className="text-xl font-bold tracking-tight text-foreground">
                    Confirm the customer&apos;s payment claim
                  </h3>
                  <p id="payment-claim-description" className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Confirming a claim records the payment, updates the invoice and generates its receipt as one transaction.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close payment claim prompt"
                disabled={recording || Boolean(confirmingClaimPid)}
                onClick={() => setClaimPromptOpen(false)}
                className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[55vh] space-y-3 overflow-y-auto p-6">
              {pendingClaims.map((claim) => {
                const amountMatches = paymentAmount
                  ? Math.abs(Number(paymentAmount) - Number(claim.claimedAmount)) < 0.001
                  : false;
                const confirming = confirmingClaimPid === claim.pidClaim;

                return (
                  <div key={claim.pidClaim} className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-bold text-foreground">
                            {claim.currency} {Number(claim.claimedAmount).toLocaleString()}
                          </span>
                          {amountMatches ? (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                              Matches entered amount
                            </span>
                          ) : null}
                        </div>
                        <p className="break-all text-xs font-medium text-muted-foreground">
                          Reference: <span className="font-mono text-foreground">{claim.paymentReference || 'Not provided'}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted {new Date(claim.claimedAt).toLocaleString()}
                        </p>
                        {claim.note ? <p className="pt-1 text-xs text-muted-foreground">{claim.note}</p> : null}
                      </div>
                      <button
                        type="button"
                        disabled={recording || Boolean(confirmingClaimPid)}
                        onClick={() => confirmPaymentClaim(claim.pidClaim)}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {confirming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {confirming ? 'Confirming...' : 'Confirm this claim'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border bg-muted/20 p-6">
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                Only record a separate payment when the transaction you entered is not represented by any claim above.
              </p>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={recording || Boolean(confirmingClaimPid)}
                  onClick={() => setClaimPromptOpen(false)}
                  className="rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!paymentAmount || recording || Boolean(confirmingClaimPid)}
                  onClick={() => submitManualPayment(true)}
                  className="rounded-md border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {recording ? 'Recording...' : 'Record separate payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
