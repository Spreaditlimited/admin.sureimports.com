'use client';

import React from 'react';
import { Calendar, CreditCard, User, Receipt } from 'lucide-react';

const CustomersTransactionTable: React.FC<any> = ({ transactions }) => {
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount / 100); // Assuming amount is in kobo
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let style = 'bg-muted text-muted-foreground border-border';
    
    if (s === 'success') style = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    else if (s === 'failed') style = 'bg-destructive/10 text-destructive border-destructive/20';
    else if (s === 'pending') style = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    else if (s === 'abandoned') style = 'bg-muted text-muted-foreground border-border';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-card shadow-soft">
      <table className="w-full text-left text-sm text-foreground">
        
        <thead className="bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <tr>
            <th scope="col" className="px-6 py-4">Transaction Details</th>
            <th scope="col" className="px-6 py-4">Amount & Fees</th>
            <th scope="col" className="px-6 py-4 text-center">Status</th>
            <th scope="col" className="px-6 py-4 text-center">Channel</th>
            <th scope="col" className="px-6 py-4 text-right">Date</th>
          </tr>
        </thead>
        
        <tbody className="divide-y divide-border bg-card">
          {transactions.map((transaction: any) => (
            <tr
              key={transaction.id}
              className="transition-colors hover:bg-muted/30"
            >
              {/* Transaction & Customer */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/5 rounded-md text-primary shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono text-[11px] font-medium text-muted-foreground truncate max-w-[150px] lg:max-w-none">
                      {transaction.reference}
                    </span>
                    <span className="font-semibold text-foreground truncate">
                      {transaction.customer.first_name} {transaction.customer.last_name}
                    </span>
                  </div>
                </div>
              </td>

              {/* Amount & Fees */}
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="font-bold text-foreground">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </span>
                  {transaction.fees > 0 && (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Fee: {formatCurrency(transaction.fees, transaction.currency)}
                    </span>
                  )}
                </div>
              </td>

              {/* Status & Gateway Response */}
              <td className="px-6 py-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  {getStatusBadge(transaction.status)}
                  <span className="text-[10px] text-muted-foreground font-medium italic">
                    {transaction.gateway_response}
                  </span>
                </div>
              </td>

              {/* Channel */}
              <td className="px-6 py-4 text-center">
                <span className="inline-block px-2 py-1 rounded bg-muted text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                  {transaction.channel.replace(/_/g, ' ')}
                </span>
              </td>

              {/* Date */}
              <td className="px-6 py-4 text-right">
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{formatDate(transaction.created_at).split(',')[0]}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(transaction.created_at).split(',')[1]}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomersTransactionTable;