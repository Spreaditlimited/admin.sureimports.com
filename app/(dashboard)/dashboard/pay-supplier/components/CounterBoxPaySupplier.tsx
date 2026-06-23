'use client'

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BadgeDollarSign,
  Bookmark,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';


interface Record {
  savedOrder: number;
  paymentPendingOrder: number;
  paidSupplierOrder: number;
  cancelledOrder: number;
}


const CounterBoxPaySupplier = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'none';
  const [recordx, setRecord] = useState<Record | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/get-data/pay-supplier-count?status=${status}`);
        if (res.ok) {
          const data = await res.json();
          setRecord(data);
        }
      } catch (error) {
        console.error("Failed to fetch Pay Supplier counts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [status]);

 
const handleClick = (status: string) => {
 router.push('/dashboard/pay-supplier?status='+status)
};

  const filterButtons = [
    { id: 'saved', label: 'Saved Requests', count: recordx?.savedOrder, icon: Bookmark },
    { id: 'pending-payment', label: 'Bank Pending', count: recordx?.paymentPendingOrder, icon: ShieldCheck },
    { id: 'paid-supplier', label: 'Paid Supplier', count: recordx?.paidSupplierOrder, icon: BadgeDollarSign },
    { id: 'request-cancelled', label: 'Request Cancelled', count: recordx?.cancelledOrder, icon: PackageCheck },
  ];

  return (
    <div className="w-full">
      <div className="overflow-x-auto scrollbar-hide pb-2">
        <div className="flex items-center gap-2 min-w-max">
        {filterButtons.map((btn) => {
          const isActive = status === btn.id;
          const Icon = btn.icon;

          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => handleClick(btn.id)}
              className={`
                flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-200
                ${isActive
                  ? 'bg-primary border-primary text-primary-foreground shadow-sm ring-2 ring-primary/20'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }
              `}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider">{btn.label}</span>
              <span
                className={`
                  inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold
                  ${isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-foreground'
                  }
                `}
              >
                {loading ? '...' : btn.count || 0}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => router.push('/dashboard/pay-supplier')}
          className="p-2 text-muted-foreground hover:text-primary transition-colors ml-2"
          title="Reset Filters"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        </div>
      </div>

      <div className="h-px bg-border mt-4 w-full" />
    </div>
  );
};

export default CounterBoxPaySupplier;
