import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Pay Supplier | Admin Dashboard',
    description: 'Monitor and manage supplier payment transactions'
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
        
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Payout Transactions
        </h1>
        <p className="text-sm text-muted-foreground">
          Track and audit all completed and ongoing supplier payment transfers.
        </p>
      </div>

      {/* Page Content */}
      {/* Add your Transaction Table component here when ready */}
      
    </div>
  )
}