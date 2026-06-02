import { Metadata } from 'next';
import React from 'react';
import StoreSalesTable from './components/StoreSalesTable';

export const metadata: Metadata = {
    title: 'Sales Operations Ledger | Admin Dashboard',
    description: 'Track storefront customer orders, manage sales compliance, and audit point-of-sale transactions.'
};

export default function StoreSalesPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Sales Operations Ledger
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor storefront fulfillment pipelines, analyze incoming customer order streams, and audit transaction lifecycles.
        </p>
      </div>

      {/* 2. Main Sales Ledger Workspace */}
      <div className="pt-2">
        <StoreSalesTable />
      </div>
      
    </div>
  );
}