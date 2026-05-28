'use client'

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Defined the interface to replace 'any' for better TypeScript support
interface PaySmallSmallCounts {
  savedPaySmallSmall: number;
  startedPaySmallSmall: number;
  completedPaySmallSmall: number;
  cancelledPaySmallSmall: number;
}

const CounterBoxPaySmallSmall = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'none';
  const [recordx, setRecord] = useState<PaySmallSmallCounts | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await fetch(`/api/get-data/pay-small-small-count?status=${status}`);
        if (res.ok) {
          const data = await res.json();
          setRecord(data);
        }
      } catch (error) {
        console.error("Failed to fetch Pay Small Small counts:", error);
      }
    };
    fetchRecord();
  }, [status]);

  const handleClick = (newStatus: string) => {
    router.push('/dashboard/pay-small-small?status=' + newStatus);
  };

  // Array of filter configurations to keep the code DRY and easy to manage
  const filterButtons = [
    { id: 'SAVED', label: 'Saved', count: recordx?.savedPaySmallSmall },
    { id: 'STARTED', label: 'Started', count: recordx?.startedPaySmallSmall },
    { id: 'COMPLETED', label: 'Completed', count: recordx?.completedPaySmallSmall },
    { id: 'CANCELLED', label: 'Cancelled', count: recordx?.cancelledPaySmallSmall },
  ];

  return (
    <div className="w-full bg-card border border-border shadow-soft rounded-lg p-2 sm:p-4">
      {/* Using our global custom-scrollbar to keep the UI clean on overflow */}
      <div className="flex space-x-3 overflow-x-auto custom-scrollbar pb-2 pt-1 px-2">
        
        {filterButtons.map((btn) => {
          // Check if this button represents the currently active status filter
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

export default CounterBoxPaySmallSmall;