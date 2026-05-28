import { Metadata } from 'next';
import React from 'react';
import PayoutRequestsTable from './components/PayoutRequestsTable';

export const metadata: Metadata = {
    title: 'Payout Requests | Admin Dashboard',
    description: 'Manage and process customer payout requests'
};

export default function PayoutRequestsPage() {
  return (
    <div className="space-y-6">
        
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Payout Requests
        </h1>
        <p className="text-sm text-muted-foreground">
          Review, approve, or decline customer withdrawal and payout requests.
        </p>
      </div>

      {/* Page Content */}
      <PayoutRequestsTable />
      
    </div>
  )
}