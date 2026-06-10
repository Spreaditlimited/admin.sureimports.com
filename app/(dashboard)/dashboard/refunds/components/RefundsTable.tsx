'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

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
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

function formatCurrency(amount: string | number | null | undefined, currency = 'NGN') {
  const value = Number.parseFloat(String(amount || '0'));
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeCurrency = String(currency || 'NGN').toUpperCase();

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    return `${safeCurrency} ${safeValue.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: string | null) {
  const s = String(status || 'pending').toLowerCase();
  let style = 'bg-muted text-muted-foreground border-border';
  if (s === 'pending') style = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  if (s === 'requested') style = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
  if (s === 'wallet-transferred') style = 'bg-purple-500/10 text-purple-600 border-purple-500/20';
  if (s === 'paid') style = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  if (s === 'cancelled' || s === 'rejected') style = 'bg-destructive/10 text-destructive border-destructive/20';

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style}`}>
      {s.replace('-', ' ')}
    </span>
  );
}

export default function RefundsTable() {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalsByCurrency, setTotalsByCurrency] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);

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

      if (data.statusx === 'SUCCESS') {
        setRefunds(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
        setTotalsByCurrency(data.totalsByCurrency || {});
        setServiceTypes(data.serviceTypes || []);
      } else {
        setError(data.message || 'Failed to fetch refunds');
      }
    } catch {
      setError('Connection error. Please try again.');
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage, search, status, serviceType]);

  useEffect(() => {
    const handler = setTimeout(fetchRefunds, 300);
    return () => clearTimeout(handler);
  }, [fetchRefunds]);

  const markPaid = async (refund: RefundRecord) => {
    const reference = window.prompt(
      'Payment reference or note for this refund',
      refund.ext1 || refund.pidRefund
    );
    if (reference === null) return;

    setSettlingId(refund.pidRefund);
    try {
      const response = await fetch(`/api/refunds/${refund.pidRefund}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });
      const data = await response.json();

      if (!response.ok || data.statusx !== 'SUCCESS') {
        toast.error(data.message || 'Failed to mark refund as paid');
        return;
      }

      toast.success(data.message || 'Refund marked as paid');
      fetchRefunds();
    } catch {
      toast.error('Failed to mark refund as paid');
    } finally {
      setSettlingId(null);
    }
  };

  const canMarkPaid = (refund: RefundRecord) =>
    String(refund.refundStatus || '').toLowerCase() !== 'paid';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft lg:col-span-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Filtered Refund Volume By Currency
          </span>
          <div className="mt-3 flex flex-wrap gap-3">
            {Object.keys(totalsByCurrency).length > 0 ? (
              Object.entries(totalsByCurrency).map(([currency, amount]) => (
                <div key={currency} className="rounded-md border border-border bg-muted/20 px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{currency}</div>
                  <div className="text-2xl font-bold text-foreground">{formatCurrency(amount, currency)}</div>
                </div>
              ))
            ) : (
              <div className="text-2xl font-bold text-foreground">{formatCurrency(0)}</div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Across {totalCount} refund records</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-6 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Open Items
          </span>
          <span className="mt-1 text-3xl font-bold text-foreground">
            {refunds.filter((item) => String(item.refundStatus || '').toLowerCase() !== 'paid').length}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">ON THIS PAGE</span>
        </div>
      </div>

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
              <option key={item} value={item}>{item}</option>
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
                <option key={option} value={option}>{option} / page</option>
              ))}
            </select>
            <button
              onClick={fetchRefunds}
              className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-muted"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
                  <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground">
                    No refunds found.
                  </td>
                </tr>
              ) : (
                refunds.map((refund) => {
                  const customerName =
                    `${refund.customer?.userFirstname || ''} ${refund.customer?.userLastname || ''}`.trim() ||
                    'Unknown Customer';

                  return (
                    <tr key={refund.pidRefund} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-foreground">{refund.pidRefund}</span>
                          <span className="text-[11px] text-muted-foreground">Order: {refund.pidOrder || 'N/A'}</span>
                          <span className="text-[11px] text-muted-foreground">{formatDate(refund.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground">{customerName}</span>
                          <span className="text-[11px] text-muted-foreground">{refund.customer?.userEmail || refund.pidUser || 'N/A'}</span>
                          <span className="text-[11px] text-muted-foreground">{refund.customer?.userPhone || 'No phone'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {refund.serviceType || 'N/A'}
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {formatCurrency(refund.amount, refund.currency || 'NGN')}
                      </td>
                      <td className="px-6 py-4">{statusBadge(refund.refundStatus)}</td>
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
                              Mark Paid
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
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
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
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
                <h2 className="text-lg font-bold text-foreground">{selectedRefund.pidRefund}</h2>
                <p className="text-sm text-muted-foreground">Refund details and customer settlement information</p>
              </div>
              <button
                onClick={() => setSelectedRefund(null)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Detail label="Customer" value={`${selectedRefund.customer?.userFirstname || ''} ${selectedRefund.customer?.userLastname || ''}`.trim() || 'Unknown'} />
              <Detail label="Email" value={selectedRefund.customer?.userEmail || 'N/A'} />
              <Detail label="Bank" value={selectedRefund.customer?.bank_name || 'N/A'} />
              <Detail label="Account Name" value={selectedRefund.customer?.bank_account_name || 'N/A'} />
              <Detail label="Account Number" value={selectedRefund.customer?.bank_account_number || 'N/A'} />
              <Detail label="Wallet Reference" value={selectedRefund.ext1 || 'N/A'} />
              <Detail label="Settlement Metadata" value={selectedRefund.ext2 || 'N/A'} wide />
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
    <div className={`rounded-md border border-border bg-muted/20 p-3 ${wide ? 'md:col-span-2' : ''}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
