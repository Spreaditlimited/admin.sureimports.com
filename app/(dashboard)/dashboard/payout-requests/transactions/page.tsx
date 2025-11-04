
import { Metadata } from 'next';
import React from 'react';
import { DashboardLayout } from '../../components/dashboard-layout';

export const metadata: Metadata = {
    title: 'Pay Supplier Admin Dashboard',
    description: 'Pay Supplier Services'
};

export default function DashboardPage() {
  return (
      <>
          <h1 className="text-2xl font-bold mb-6">Payout Transactions</h1>
      </>
  )
}
