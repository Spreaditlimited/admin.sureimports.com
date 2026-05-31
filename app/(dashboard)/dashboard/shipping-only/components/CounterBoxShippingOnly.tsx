'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Bookmark, 
  ShieldCheck, 
  Wallet, 
  FileText,
  BadgeDollarSign,
  Truck, 
  PackageCheck,
  RefreshCw
} from 'lucide-react';

interface Record {
  requestReceivedOrder: number;
  productShippedOrder: number;
  productArrivedOrder: number;
  invoicedOrder: number;
  paidOrder: number;
  productDeliveredOrder: number;
  cancelledRequestOrder: number;
}

const CounterBoxShippingOnly = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') || 'all';
  
  const [recordx, setRecord] = useState<Record | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/get-data/shipping-only-count?status=${currentStatus}`);
        const data = await res.json();
        setRecord(data);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [currentStatus]);

  const handleStatusShift = (status: string) => {
    router.push(`/dashboard/shipping-only?status=${status}`);
  };

  const STATUS_CONFIG = [
    { key: 'request-received', label: 'Request Received', count: recordx?.requestReceivedOrder, icon: Bookmark },
    { key: 'product-shipped', label: 'Shipped', count: recordx?.productShippedOrder, icon: ShieldCheck },
    { key: 'product-arrived', label: 'Arrived', count: recordx?.productArrivedOrder, icon: Wallet },
    { key: 'invoiced', label: 'Invoiced', count: recordx?.invoicedOrder, icon: FileText },
    { key: 'paid', label: 'Paid', count: recordx?.paidOrder, icon: BadgeDollarSign },
    { key: 'product-delivered', label: 'Completed', count: recordx?.productDeliveredOrder, icon: Truck },
    { key: 'request-cancelled', label: 'Request Cancelled', count: recordx?.cancelledRequestOrder, icon: PackageCheck },
  ];

  return (
    <div className="w-full">
      {/* status scroller */}
      <div className="overflow-x-auto scrollbar-hide pb-2">
        <div className="flex items-center gap-2 min-w-max">
          {STATUS_CONFIG.map((status) => {
            const isActive = currentStatus === status.key;
            const Icon = status.icon;

            return (
              <button
                key={status.key}
                type="button"
                onClick={() => handleStatusShift(status.key)}
                className={`
                  flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-200
                  ${isActive 
                    ? 'bg-primary border-primary text-primary-foreground shadow-sm ring-2 ring-primary/20' 
                    : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }
                `}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {status.label}
                </span>
                <span className={`
                  inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold
                  ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-foreground'}
                `}>
                  {loading ? '...' : status.count || 0}
                </span>
              </button>
            );
          })}

          <button 
            onClick={() => router.push('/dashboard/shipping-only')}
            className="p-2 text-muted-foreground hover:text-primary transition-colors ml-2"
            title="Reset Filters"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Active Indicator Line */}
      <div className="h-px bg-border mt-4 w-full" />
    </div>
  );
};

export default CounterBoxShippingOnly;
