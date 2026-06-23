import PaySupplier from './components/PaySupplier';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Pay Supplier | Admin Dashboard',
    description: 'Pay Supplier Services'
};

export default function DashboardPage() {
  return (
      <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-1 px-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Pay Supplier
              </h1>
              <p className="text-sm text-muted-foreground">
                  Manage supplier payment requests, review customer uploads, and process RMB supplier payments.
              </p>
          </div>

          {/* Page Content */}
          <PaySupplier />
      </div>
  )
}
