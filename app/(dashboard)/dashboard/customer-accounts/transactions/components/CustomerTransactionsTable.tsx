'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';
import Loading from '@/components/layouts/loading';
import TransactionsTable from './TransactionsTable';

export default function ProductsTable() {
  const navigateWithAlert = useNavigationWithAlert();
  const router = useRouter();
  
  const [statusz, setStatus2] = useState<any>('ok');
  const [customerAccounts, setCustomerAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransaction] = useState<any | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`/api/paystack/dedicated-accounts?status=ok`);
        const data: any = await response.json();

        setCustomerAccounts(data.accountDetails?.data || []);
        setTransaction(data.transactionDetails);
      } catch (err) {
        setError('Failed to fetch transaction data');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [statusz]);

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

  const transactionList = transactions?.transactions || [];

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {transactionList.length} Customer Transactions
        </h2>
      </div>

      {/* Table Container - Removed gray backgrounds and applied system tokens */}
      <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        <Suspense fallback={<Loading />}>
          {transactionList.length > 0 ? (
            <TransactionsTable transactions={transactionList} />
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