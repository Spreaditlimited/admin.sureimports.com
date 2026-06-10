'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import Loading from '@/components/layouts/loading';
import TransactionsTable from './TransactionsTable';

type WalletTransaction = {
  id: string;
  source: 'paystack' | 'ledger';
  direction: 'credit' | 'debit';
  reference: string;
  pidUser: string | null;
  customerName: string;
  email: string;
  amount: number;
  currency: string;
  status: string;
  channel: string;
  description: string;
  fee: number;
  createdAt: string;
};

type CustomerBalance = {
  pidUser: string | null;
  customerName: string;
  email: string;
  currency: string;
  credits: number;
  debits: number;
  rawBalance: number;
  balance: number;
};

export default function ProductsTable() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [customerBalances, setCustomerBalances] = useState<CustomerBalance[]>([]);
  const [aggregateWalletBalance, setAggregateWalletBalance] = useState(0);
  const [aggregateNetWalletBalance, setAggregateNetWalletBalance] = useState(0);
  const [aggregateNegativeBalances, setAggregateNegativeBalances] = useState(0);
  const [aggregateCredits, setAggregateCredits] = useState(0);
  const [aggregateDebits, setAggregateDebits] = useState(0);
  const [search, setSearch] = useState('');
  const [debitPidUser, setDebitPidUser] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [debitReason, setDebitReason] = useState('');
  const [debitReference, setDebitReference] = useState('');
  const [debiting, setDebiting] = useState(false);

  const formatCurrency = (amount: number, currency = 'NGN') =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);

  const fetchWalletData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
      });
      const response = await fetch(`/api/wallets/transactions?${params}`);
      const data = await response.json();

      if (data.statusx !== 'SUCCESS') {
        setError(data.message || 'Failed to fetch wallet transaction data');
        return;
      }

      setTransactions(data.data || []);
      setCustomerBalances(data.customerBalances || []);
      setAggregateWalletBalance(data.aggregateWalletBalance || 0);
      setAggregateNetWalletBalance(data.aggregateNetWalletBalance || 0);
      setAggregateNegativeBalances(data.aggregateNegativeBalances || 0);
      setAggregateCredits(data.aggregateCredits || 0);
      setAggregateDebits(data.aggregateDebits || 0);
    } catch {
      setError('Failed to fetch wallet transaction data');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const handler = setTimeout(fetchWalletData, 300);
    return () => clearTimeout(handler);
  }, [fetchWalletData]);

  const submitDebit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDebiting(true);

    try {
      const response = await fetch('/api/wallets/debit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pidUser: debitPidUser,
          amount: Number(debitAmount),
          reason: debitReason,
          reference: debitReference,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.statusx !== 'SUCCESS') {
        toast.error(data.message || 'Failed to debit wallet');
        return;
      }

      toast.success(data.message || 'Wallet debit recorded');
      setDebitAmount('');
      setDebitReason('');
      setDebitReference('');
      await fetchWalletData();
    } catch {
      toast.error('Failed to debit wallet');
    } finally {
      setDebiting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12 text-sm font-medium text-muted-foreground animate-pulse">
        Loading transactions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aggregate Wallet Balance</span>
          <p className="mt-1 text-3xl font-bold text-foreground">{formatCurrency(aggregateWalletBalance)}</p>
          <p className="text-xs text-muted-foreground">Available positive balances across {customerBalances.length} wallets</p>
          {aggregateNegativeBalances < 0 && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Net ledger: {formatCurrency(aggregateNetWalletBalance)} after {formatCurrency(Math.abs(aggregateNegativeBalances))} negative balances.
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Credits</span>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(aggregateCredits)}</p>
          <p className="text-xs text-muted-foreground">Dedicated account credits plus refund credits</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Debits</span>
          <p className="mt-1 text-2xl font-bold text-rose-600">{formatCurrency(aggregateDebits)}</p>
          <p className="text-xs text-muted-foreground">Payouts and admin wallet debits</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm xl:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search Wallet Ledger</label>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by customer, email, reference, reason..."
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        <form onSubmit={submitDebit} className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Manual Wallet Debit</div>
          <div className="space-y-3">
            <select
              value={debitPidUser}
              onChange={(event) => setDebitPidUser(event.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select customer wallet</option>
              {customerBalances.map((customer) => (
                <option key={customer.pidUser || customer.email} value={customer.pidUser || ''}>
                  {customer.customerName} - {formatCurrency(customer.balance, customer.currency)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              step="0.01"
              value={debitAmount}
              onChange={(event) => setDebitAmount(event.target.value)}
              placeholder="Amount"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <input
              type="text"
              value={debitReference}
              onChange={(event) => setDebitReference(event.target.value)}
              placeholder="Reference (optional)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <textarea
              value={debitReason}
              onChange={(event) => setDebitReason(event.target.value)}
              placeholder="Clear reason shown to customer"
              required
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <button
              type="submit"
              disabled={debiting}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {debiting ? 'Debiting...' : 'Debit Wallet'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer Wallet Balances</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {customerBalances.slice(0, 12).map((customer) => (
            <div key={customer.pidUser || customer.email} className="rounded-md border border-border bg-muted/20 p-3">
              <div className="text-sm font-bold text-foreground">{customer.customerName}</div>
              <div className="text-[11px] text-muted-foreground">{customer.email || customer.pidUser}</div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-bold text-foreground">{formatCurrency(customer.balance, customer.currency)}</span>
              </div>
              {customer.rawBalance < 0 && (
                <div className="mt-1 text-[10px] text-rose-600">
                  Net ledger {formatCurrency(customer.rawBalance, customer.currency)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {transactions.length} Wallet Transactions
          </h2>
        </div>
        <Suspense fallback={<Loading />}>
          {transactions.length > 0 ? (
            <TransactionsTable transactions={transactions} />
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="p-3 bg-muted rounded-full mb-3">
                 {/* Reusing a subtle icon placement style from previous pages */}
                 <svg className="w-6 h-6 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                 </svg>
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No transactions available
              </p>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
