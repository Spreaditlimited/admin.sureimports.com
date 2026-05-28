'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Calendar,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';

export default function CustomerTransactionsTable() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Fetch Logic (Simplified for this example)
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/crud/transactions/fetch`);
      const data = await response.json();
      if (data.successx) setTransactions(data.data);
    } catch (error) {
      toast.error('Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getStatusBadge = (status: string) => {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          {status}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium italic">Approved</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Stats (Matching Customers Page style) */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {transactions.length} Customer Transactions
        </h2>
      </div>

      {/* 2. Main Table Container */}
      <div className="w-full overflow-x-auto rounded-lg border border-border bg-card shadow-soft">
        <table className="w-full text-left text-sm text-foreground">
          
          <thead className="border-b border-border bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-6 py-4">Transaction Details</th>
              <th scope="col" className="px-6 py-4 text-center">Amount & Fee</th>
              <th scope="col" className="px-6 py-4 text-center">Status</th>
              <th scope="col" className="px-6 py-4 text-center">Channel</th>
              <th scope="col" className="px-6 py-4 text-right">Date</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-border bg-card">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center animate-pulse text-muted-foreground">
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-muted-foreground font-medium">
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions.map((tx, index) => (
                <tr key={index} className="transition-colors hover:bg-muted/30">
                  
                  {/* Transaction Details */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-md text-primary">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-muted-foreground tracking-tighter">
                          {tx.pidTransaction || '10003326050517...'}
                        </span>
                        <span className="font-semibold text-foreground mt-0.5">
                          {tx.customerName || 'Tolani kazeem Olanrewaju'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Amount & Fee */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">
                        ₦{parseFloat(tx.amount || 2000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Fee: ₦{parseFloat(tx.fee || 20).toLocaleString()}
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(tx.status || 'Success')}
                  </td>

                  {/* Channel */}
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      {tx.channel || 'dedicated nuban'}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>May 5, 2026</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">at 06:41 PM</span>
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* 3. Reusable Pagination (Optional) */}
      <div className="flex items-center justify-end gap-2 px-1">
        <button className="p-2 border border-border rounded-md hover:bg-muted disabled:opacity-50">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button className="p-2 border border-border rounded-md hover:bg-muted disabled:opacity-50">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}