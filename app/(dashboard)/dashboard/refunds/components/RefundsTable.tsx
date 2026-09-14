"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface SettlementSummary { settlementCurrency: string; method: string; settledAmount: number; outstandingAmount: number; count: number }

interface Customer {
  pidUser: string;
  userFirstname: string | null;
  userLastname: string | null;
  userEmail: string | null;
  userPhone: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
}

interface RefundRecord {
  providerLegs?: Array<{ id: string; currency: string; amount: string; status: string; providerReference: string | null; firstAttemptAt: string | null }>;
  id: number;
  pidRefund: string;
  pidUser: string | null;
  pidOrder: string | null;
  amount: string | null;
  currency: string | null;
  refundStatus: string | null;
  serviceType: string | null;
  ext1: string | null;
  ext2: string | null;
  xStatus: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  customer: Customer | null;
  settlement?: { method: string; settlementCurrency: string; settlementAmount: string; exchangeRate: string; status: string; reference: string | null; destination: Record<string, string> } | null;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

function formatCurrency(
  amount: string | number | null | undefined,
  currency = "NGN",
) {
  const value = Number.parseFloat(String(amount || "0"));
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeCurrency = String(currency || "NGN").toUpperCase();

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    return `${safeCurrency} ${safeValue.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string | null) {
  const s = String(status || "pending").toLowerCase();
  let style = "bg-muted text-muted-foreground border-border";
  if (s === "pending")
    style = "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (s === "requested")
    style = "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (s === "wallet-transferred")
    style = "bg-purple-500/10 text-purple-600 border-purple-500/20";
  if (s === "paid")
    style = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s === "refunded")
    style = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (s === "cancelled" || s === "rejected")
    style = "bg-destructive/10 text-destructive border-destructive/20";

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style}`}
    >
      {s.replace("-", " ")}
    </span>
  );
}

export default function RefundsTable() {
  const [externalReviews, setExternalReviews] = useState<Array<{ id: string; providerReference: string; captureId: string; amount: string; currency: string; providerStatus: string }>>([]);
  const [settlementSummary, setSettlementSummary] = useState<SettlementSummary[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalsByCurrency, setTotalsByCurrency] = useState<
    Record<string, number>
  >({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(
    null,
  );

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(itemsPerPage),
        ...(search && { search }),
        ...(status && { status }),
        ...(serviceType && { serviceType }),
      });

      const response = await fetch(`/api/refunds?${params}`);
      const data = await response.json();

      if (data.statusx === "SUCCESS") {
        setRefunds(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
        setTotalsByCurrency(data.totalsByCurrency || {});
        setSettlementSummary(data.settlementSummary || []);
        setExternalReviews(data.externalReviews || []);
        setServiceTypes(data.serviceTypes || []);
      } else {
        setError(data.message || "Failed to fetch refunds");
      }
    } catch {
      setError("Connection error. Please try again.");
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage, search, status, serviceType]);

  useEffect(() => {
    const handler = setTimeout(fetchRefunds, 300);
    return () => clearTimeout(handler);
  }, [fetchRefunds]);

  const [foreignSettlement, setForeignSettlement] = useState<RefundRecord | null>(null);
  const [settlementError, setSettlementError] = useState('');
  const settlementPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (foreignSettlement) {
      settlementPanel.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      settlementPanel.current?.focus({ preventScroll: true });
    }
  }, [foreignSettlement]);
  async function confirmSettlement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!foreignSettlement) return;
    const form = new FormData(event.currentTarget);
    const paypal = foreignSettlement.settlement?.method === "PAYPAL";
    setSettlingId(foreignSettlement.pidRefund); setSettlementError('');
    try {
      const response = await fetch('/api/refunds/' + foreignSettlement.pidRefund + '/mark-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: paypal ? 'PAYPAL' : 'BANK', confirmed: form.get('verified') === 'on', reference: form.get('reference'), confirmedAmount: form.get('amount'), confirmedCurrency: foreignSettlement.settlement?.settlementCurrency, destinationVerified: form.get('verified') === 'on' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      toast.success(data.message); setForeignSettlement(null); fetchRefunds();
    } catch (error) { setSettlementError(error instanceof Error ? error.message : 'Unable to confirm settlement.'); }
    finally { setSettlingId(null); }
  }
  async function classifyExternal(event:React.FormEvent<HTMLFormElement>,providerReference:string){
    event.preventDefault();if(settlingId)return;const form=new FormData(event.currentTarget);setSettlingId(providerReference);
    try{const response=await fetch('/api/refunds/external',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'CLASSIFY',providerReference,remainingEligiblePercent:form.get('percentage'),reason:form.get('reason'),confirmed:form.get('confirmed')==='on'})});const data=await response.json();if(!response.ok)throw Error(data.message);toast.success(data.message);void fetchRefunds();}catch(error){toast.error(error instanceof Error?error.message:'Unable to record the review. Refresh before trying again.');}finally{setSettlingId(null);}
  }
  async function checkUnpaidExternal(providerReference: string) {
    if(settlingId) return;setSettlingId(providerReference);
    try { const response=await fetch('/api/refunds/external',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'CHECK_NOT_PAID',providerReference})});const data=await response.json();if(!response.ok)throw new Error(data.message);toast.success(data.message);void fetchRefunds(); }
    catch(error){toast.error(error instanceof Error?error.message:'Unable to check this refund. Refresh its status.');}finally{setSettlingId(null);}
  }
  async function linkExternal(event: React.FormEvent<HTMLFormElement>, providerReference: string) {
    event.preventDefault();
    if (settlingId) return;
    const form = new FormData(event.currentTarget);
    const refundId = String(form.get('refundId') || '').trim();
    setSettlingId(providerReference);
    try {
      const response = await fetch('/api/refunds/' + encodeURIComponent(refundId) + '/mark-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'LINK_EXTERNAL_PAYPAL', providerReference, confirmed: form.get('confirmed') === 'on' }) });
      const data = await response.json();
      if (!response.ok) { toast.error(data.message || 'Unable to reconcile this refund.'); return; }
      toast.success(data.message); void fetchRefunds();
    } catch { toast.error('Unable to confirm the result. Refresh the refund list before trying again.'); }
    finally { setSettlingId(null); }
  }
  async function prepareRetry(legId:string){
    if(!foreignSettlement||settlingId)return;setSettlingId(legId);
    try{const response=await fetch('/api/refunds/'+foreignSettlement.pidRefund+'/mark-paid',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'PREPARE_PAYPAL_RETRY',legId})});const data=await response.json();if(!response.ok)throw Error(data.message);toast.success(data.message);setForeignSettlement(null);void fetchRefunds();}catch(error){toast.error(error instanceof Error?error.message:'Unable to verify the failed attempt.');}finally{setSettlingId(null);}
  }
  async function checkPayPal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!foreignSettlement || settlingId) return;
    const form = new FormData(event.currentTarget);
    setSettlingId(foreignSettlement.pidRefund); setSettlementError('');
    try {
      const response = await fetch('/api/refunds/' + foreignSettlement.pidRefund + '/mark-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'CHECK_PAYPAL', legId: form.get('legId'), providerReference: form.get('providerReference') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to check PayPal status.');
      toast.success(data.message); setForeignSettlement(null); void fetchRefunds();
    } catch (error) { setSettlementError(error instanceof Error ? error.message : 'Unable to check PayPal status.'); }
    finally { setSettlingId(null); }
  }
  async function reopenLegacy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!foreignSettlement || settlingId) return;
    const form = new FormData(event.currentTarget);
    setSettlingId(foreignSettlement.pidRefund); setSettlementError('');
    try {
      const response = await fetch('/api/refunds/' + foreignSettlement.pidRefund + '/mark-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'REOPEN_LEGACY', confirmedUnpaid: form.get('confirmedUnpaid') === 'on' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      toast.success(data.message); setForeignSettlement(null); await fetchRefunds();
    } catch (error) { setSettlementError(error instanceof Error ? error.message : 'Unable to reopen request.'); }
    finally { setSettlingId(null); }
  }
  const markPaid = async (refund: RefundRecord) => {
    setForeignSettlement(refund); setSettlementError('');

  };

  const canMarkPaid = (refund: RefundRecord) =>
    String(refund.refundStatus || "").toLowerCase() === "requested";

  return (
    <div className="space-y-6">
      {foreignSettlement && <section className="rounded-xl border border-border bg-card p-6 shadow-soft" ref={settlementPanel} tabIndex={-1} aria-label="Review refund settlement">
        <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">Confirm refund settlement</h2><button onClick={() => setForeignSettlement(null)} type="button" className="rounded-md border border-border px-3 py-2">Close</button></div>
        <p className="my-4 text-sm text-muted-foreground">{foreignSettlement.settlement?.method === "PAYPAL" ? (foreignSettlement.providerLegs?.some(leg => !leg.firstAttemptAt) ? "Approving sends this refund back through PayPal. This action moves money and cannot be undone." : "This refund has already been submitted. Check its existing status below; do not create another refund for the same amount.") : "This records a bank transfer you have already completed. It does not send money."}</p>
        {foreignSettlement.settlement ? <form onSubmit={confirmSettlement} className="space-y-4">
          <p>Refund: {formatCurrency(foreignSettlement.amount, foreignSettlement.currency || 'USD')} · Transfer: <strong>{formatCurrency(foreignSettlement.settlement.settlementAmount, foreignSettlement.settlement.settlementCurrency)}</strong> · Locked rate: {String(foreignSettlement.settlement.exchangeRate)}</p>
          <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(foreignSettlement.settlement.destination).filter(([key]) => key !== 'confirmedOwnAccount').map(([key,value]) => <div key={key}><dt className="text-sm text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</dt><dd className="break-words font-medium">{String(value)}</dd></div>)}</dl>
          {foreignSettlement.settlement.method !== "PAYPAL" && <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2">Amount actually transferred<input name="amount" required inputMode="decimal" className="rounded-md border border-border bg-background p-3" /></label><label className="grid gap-2">Bank transfer reference<input name="reference" required minLength={6} maxLength={191} className="rounded-md border border-border bg-background p-3" /></label></div>}
          {settlementError && <p role="alert" className="text-destructive">{settlementError}</p>}
          {(foreignSettlement.settlement.method !== 'PAYPAL' || foreignSettlement.providerLegs?.some(leg => !leg.firstAttemptAt)) && <><label className="flex items-start gap-3"><input type="checkbox" name="verified" required className="mt-1" /> {foreignSettlement.settlement.method === "PAYPAL" ? "I approve refunding this amount to the original payment method." : "I verified the recipient owns this account, checked the original payment for previous refunds, and confirmed this bank transfer completed."}</label>
          <button disabled={Boolean(settlingId)} className="rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">{settlingId ? 'Confirming…' : foreignSettlement.settlement.method === 'PAYPAL' ? 'Approve original-payment refund' : 'Confirm completed refund'}</button></>}
        </form> : <form onSubmit={reopenLegacy} className="space-y-4"><p>This older request has no locked settlement record. Review the bank and payment-provider history before reopening it. The customer can then submit the appropriate settlement details.</p><label className="flex items-start gap-3"><input className="mt-1" type="checkbox" name="confirmedUnpaid" required />I checked the bank and provider records and confirm no refund was sent for this request.</label>{settlementError ? <p role="alert" className="text-destructive">{settlementError}</p> : null}<button type="submit" disabled={Boolean(settlingId)} className="rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">{settlingId ? 'Reopening…' : 'Reopen for customer settlement details'}</button></form>}
      {foreignSettlement.settlement?.method === 'PAYPAL' && <div className="mt-6 space-y-4 border-t border-border pt-5">
          <h3 className="font-semibold">Check or recover PayPal status</h3><p className="text-sm text-muted-foreground">These checks do not send another refund. If a response was lost, enter the refund reference shown in PayPal for the matching payment part.</p>
          <form onSubmit={checkPayPal}><button disabled={Boolean(settlingId)} className="rounded-md border border-border px-4 py-3 font-semibold">Check existing refund status</button></form>
          {foreignSettlement.providerLegs?.map((leg,index) => <div key={leg.id} className="rounded-lg border border-border p-4 space-y-3"><p className="text-sm font-medium">Payment part {index + 1} · {formatCurrency(leg.amount, leg.currency)} · {leg.status === 'SUPERSEDED' ? 'Replaced after confirmed failure' : leg.status === 'FAILED' ? 'Failed — review retry' : leg.status === 'SETTLED' ? 'Completed' : leg.firstAttemptAt ? 'Awaiting confirmation' : 'Not yet sent'}</p>{leg.status === 'FAILED' && leg.providerReference && <button type="button" disabled={Boolean(settlingId)} onClick={()=>prepareRetry(leg.id)} className="rounded-md border border-border px-4 py-3 font-semibold">Verify failure and prepare retry</button>}{leg.providerReference && <p className="text-sm text-muted-foreground">PayPal reference: {leg.providerReference}</p>}{leg.firstAttemptAt && !leg.providerReference && leg.status !== 'SETTLED' && <form onSubmit={checkPayPal} className="flex flex-col gap-3 sm:flex-row sm:items-end"><input type="hidden" name="legId" value={leg.id} /><label className="grid gap-2 text-sm">PayPal refund reference<input required name="providerReference" minLength={5} maxLength={80} className="rounded-md border border-border bg-background p-3" /></label><button disabled={Boolean(settlingId)} className="rounded-md border border-border px-4 py-3 font-semibold">Verify refund reference</button></form>}</div>)}
        </div>}
      </section>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft lg:col-span-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Filtered Refund Volume By Currency
          </span>
          <div className="mt-3 flex flex-wrap gap-3">
            {Object.keys(totalsByCurrency).length > 0 ? (
              Object.entries(totalsByCurrency).map(([currency, amount]) => (
                <div
                  key={currency}
                  className="rounded-md border border-border bg-muted/20 px-4 py-3"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {currency}
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(amount, currency)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(0)}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Across {totalCount} refund records
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-6 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Refund Requests
          </span>
          <span className="mt-1 text-3xl font-bold text-foreground">
            {
              refunds.filter(
                (item) =>
                  String(item.refundStatus || "").toLowerCase() === "requested",
              ).length
            }
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            ON THIS PAGE
          </span>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 space-y-4" aria-label="Refund settlement report">
        {externalReviews.length > 0 && <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4 space-y-3"><h3 className="font-semibold text-foreground">PayPal refunds requiring reconciliation</h3><p className="text-sm text-muted-foreground">These refunds were made outside the website. Review their product, shipping and fee allocation before releasing affected affiliate payouts. Do not send another refund for these amounts.</p><ul className="space-y-3">{externalReviews.map(item => <li key={item.id} className="border-t border-border pt-3 text-sm break-words"><strong>{formatCurrency(item.amount, item.currency)}</strong><p className="mt-1 text-muted-foreground">PayPal refund: {item.providerReference} · Capture: {item.captureId}</p><p className="mt-1 text-muted-foreground">Status when received: {item.providerStatus}</p><button type="button" disabled={Boolean(settlingId)} onClick={() => checkUnpaidExternal(item.providerReference)} className="mt-3 rounded-lg border border-border bg-background px-4 py-2 text-foreground disabled:opacity-50">Check failed or cancelled refund</button><form className="mt-4 space-y-3" onSubmit={event => linkExternal(event, item.providerReference)}><div className="flex flex-col sm:flex-row sm:items-end gap-3"><label className="block space-y-1"><span className="text-sm font-medium">Existing refund reference</span><input name="refundId" required maxLength={191} className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" /></label><button type="submit" disabled={Boolean(settlingId)} className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">{settlingId === item.providerReference ? 'Checking…' : 'Verify and link refund'}</button></div><label className="flex items-start gap-2 text-sm text-muted-foreground"><input type="checkbox" name="confirmed" required className="mt-1" /><span>I checked that this is the same customer, order and refund. This links money already returned; it does not send another refund.</span></label></form><details className="mt-4 border-t border-border pt-3"><summary className="cursor-pointer font-medium">No existing refund request? Record and classify this refund</summary><form className="mt-4 grid gap-4" onSubmit={event=>classifyExternal(event,item.providerReference)}><p className="text-muted-foreground">For procurement, enter the percentage of product value retained after this change. A shipping-only procurement refund retains 100%. For a shipping invoice, use the retained commission-eligible weight or volume. This percentage applies to remaining earnings, not to the payment amount.</p><label className="grid gap-2">Eligible value or units remaining (%)<input name="percentage" inputMode="decimal" required pattern="[0-9]+([.][0-9]{0,6})?" className="rounded-lg border border-border bg-background px-3 py-2" /></label><label className="grid gap-2">Review evidence<textarea name="reason" required minLength={20} maxLength={2000} className="rounded-lg border border-border bg-background px-3 py-2" /></label><label className="flex items-start gap-2"><input type="checkbox" name="confirmed" required className="mt-1" />I checked the original payment, refund and eligible product value or shipping units. This records money already returned; it sends no new refund.</label><button type="submit" disabled={Boolean(settlingId)} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">Verify and record existing refund</button></form></details></li>)}</ul></div>}
        <div><h2 className="font-semibold text-foreground">Refund settlements</h2><p className="text-sm text-muted-foreground">All settlement requests, independent of the filters below. Amounts use the currency actually sent; currencies are never combined.</p></div>
        {settlementSummary.length ? <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b border-border text-muted-foreground"><th className="py-3 pr-4">Currency / method</th><th className="py-3 pr-4">Completed</th><th className="py-3 pr-4">Awaiting completion</th><th className="py-3">Requests</th></tr></thead><tbody>{settlementSummary.map(row => <tr key={row.settlementCurrency + row.method} className="border-b border-border last:border-0"><td className="py-3 pr-4 font-medium">{row.settlementCurrency} · {row.method === 'BANK' ? 'Bank transfer' : row.method === 'WALLET' ? 'Wallet' : row.method === 'PARTNER_PAYSTACK' ? 'Partner · Paystack' : row.method === 'PARTNER_PAYPAL' ? 'Partner · PayPal' : 'PayPal'}</td><td className="py-3 pr-4">{formatCurrency(row.settledAmount, row.settlementCurrency)}</td><td className="py-3 pr-4">{formatCurrency(row.outstandingAmount, row.settlementCurrency)}</td><td className="py-3">{row.count}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">No settlement requests recorded yet.</p>}
      </section>
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search refund, order, customer..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="requested">Requested</option>
            <option value="wallet-transferred">Wallet Transferred</option>
            <option value="refunded">Refunded</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={serviceType}
            onChange={(event) => {
              setServiceType(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring"
          >
            <option value="">All Services</option>
            {serviceTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <select
              value={itemsPerPage}
              onChange={(event) => {
                setItemsPerPage(Number(event.target.value));
                setPage(1);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>
            <button
              onClick={fetchRefunds}
              className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-muted"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
        {error && (
          <div className="m-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="border-b border-border bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Refund</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground/40" />
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-20 text-center text-muted-foreground"
                  >
                    No refunds found.
                  </td>
                </tr>
              ) : (
                refunds.map((refund) => {
                  const customerName =
                    `${refund.customer?.userFirstname || ""} ${refund.customer?.userLastname || ""}`.trim() ||
                    "Unknown Customer";

                  return (
                    <tr
                      key={refund.pidRefund}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-foreground">
                            {refund.pidRefund}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Order: {refund.pidOrder || "N/A"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(refund.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground">
                            {customerName}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {refund.customer?.userEmail ||
                              refund.pidUser ||
                              "N/A"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {refund.customer?.userPhone || "No phone"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {refund.serviceType || "N/A"}
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {formatCurrency(
                          refund.amount,
                          refund.currency || "NGN",
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {statusBadge(refund.refundStatus)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedRefund(refund)}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          {canMarkPaid(refund) && (
                            <button
                              onClick={() => markPaid(refund)}
                              disabled={settlingId === refund.pidRefund}
                              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                            >
                              {settlingId === refund.pidRefund ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5" />
                              )}
                              Review refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-md border border-border p-2 text-muted-foreground transition hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="rounded-md border border-border p-2 text-muted-foreground transition hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-soft">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {selectedRefund.pidRefund}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Refund details and customer settlement information
                </p>
              </div>
              <button
                onClick={() => setSelectedRefund(null)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Detail
                label="Customer"
                value={
                  `${selectedRefund.customer?.userFirstname || ""} ${selectedRefund.customer?.userLastname || ""}`.trim() ||
                  "Unknown"
                }
              />
              <Detail
                label="Email"
                value={selectedRefund.customer?.userEmail || "N/A"}
              />
              <Detail
                label="Bank"
                value={selectedRefund.customer?.bank_name || "N/A"}
              />
              <Detail
                label="Account Name"
                value={selectedRefund.customer?.bank_account_name || "N/A"}
              />
              <Detail
                label="Account Number"
                value={selectedRefund.customer?.bank_account_number || "N/A"}
              />
              <Detail
                label="Wallet Reference"
                value={selectedRefund.ext1 || "N/A"}
              />
              <Detail
                label="Settlement Metadata"
                value={selectedRefund.ext2 || "N/A"}
                wide
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-border bg-muted/20 p-3 ${wide ? "md:col-span-2" : ""}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}
