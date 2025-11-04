import { Metadata } from 'next';
import React from 'react';
import PayoutRequestsTable from './components/PayoutRequestsTable';

export const metadata: Metadata = {
    title: 'Payout Requests - Admin Dashboard',
    description: 'Manage payout requests'
};

export default function PayoutRequestsPage() {
  return (
      <>
          <h1 className="text-2xl font-bold mb-6">Payout Requests</h1>
          <PayoutRequestsTable />
      </>
  )
}
