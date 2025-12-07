import { Metadata } from 'next';
import React from 'react';
import StoreSalesTable from './components/StoreSalesTable';

export const metadata: Metadata = {
    title: 'Store Sales Orders - Admin Dashboard',
    description: 'Manage store sales and customer orders'
};

export default function StoreSalesPage() {
  return (
      <>
          <h1 className="text-2xl font-bold mb-6">Store Sales Orders</h1>
          <StoreSalesTable />
      </>
  )
}

