'use client'

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Record {
  savedOrderCount: number;
  pendingOrderCount: number;
  approvedOrderCount: number;
  payForShippingOrderCount: number;
  inTransitOrderCount: number;
  readyForPickupOrderCount: number;
  completedOrdersCount: number;
  onHoldOrdersCount: number;
  bankPendingSavedOrdersCount: number;
  bankPendingShippingOrdersCount: number;
  cancelledOrdersCount: number;
}

const CounterBoxProcurement = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'none';
  const [recordx, setRecord] = useState<Record | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await fetch(`/api/get-data/procurement-count?status=${status}`);
        if (res.ok) {
          const data = await res.json();
          setRecord(data);
        }
      } catch (error) {
        console.error("Failed to fetch procurement counts:", error);
      }
    };
    fetchRecord();
  }, [status]); // Added status dependency to ensure it refetches if needed

  const handleClick = (newStatus: string) => {
    router.push('/dashboard/procurement?status=' + newStatus);
  };

  // Array of filter configurations to keep the JSX clean and DRY
  const filterButtons = [
    { id: 'saved', label: 'Saved', count: recordx?.savedOrderCount },
    { id: 'pending', label: 'Pending', count: recordx?.pendingOrderCount },
    { id: 'approved', label: 'Approved', count: recordx?.approvedOrderCount },
    { id: 'pay-for-shipping', label: 'Pay for Shipping', count: recordx?.payForShippingOrderCount },
    { id: 'in-transit', label: 'In-Transit', count: recordx?.inTransitOrderCount },
    { id: 'ready-for-pickup', label: 'Ready for Pickup', count: recordx?.readyForPickupOrderCount },
    { id: 'completed', label: 'Completed', count: recordx?.completedOrdersCount },
    { id: 'on-hold', label: 'On-Hold', count: recordx?.onHoldOrdersCount },
    { id: 'bank-pending-saved-orders', label: 'Bank Pending (Saved)', count: recordx?.bankPendingSavedOrdersCount },
    { id: 'bank-pending-shipping-orders', label: 'Bank Pending (Shipping)', count: recordx?.bankPendingShippingOrdersCount },
    { id: 'cancelled', label: 'Cancelled', count: recordx?.cancelledOrdersCount },
  ];

  return (
    <div className="w-full bg-card border border-border shadow-soft rounded-lg p-2 sm:p-4">
      {/* Using the global custom-scrollbar class defined in globals.css 
        instead of hardcoded tailwind colors 
      */}
      <div className="flex space-x-3 overflow-x-auto custom-scrollbar pb-2 pt-1 px-2">
        
        {filterButtons.map((btn) => {
          const isActive = status === btn.id;

          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => handleClick(btn.id)}
              className={`
                inline-flex items-center justify-between whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-card
                ${isActive 
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                  : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }
              `}
            >
              <span>{btn.label}</span>
              <span 
                className={`
                  ml-3 rounded-full px-2 py-0.5 text-xs font-bold
                  ${isActive 
                    ? 'bg-primary-foreground text-primary' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}
              >
                {/* Fallback to 0 if recordx is still loading */}
                {btn.count ?? 0} 
              </span>
            </button>
          );
        })}
        
      </div>
    </div>
  );
};

export default CounterBoxProcurement;