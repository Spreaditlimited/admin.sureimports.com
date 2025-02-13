'use client'

import React, { useEffect, useState } from 'react';
import { BiSolidShoppingBags, BiUser } from 'react-icons/bi';
import { HiShoppingBag } from 'react-icons/hi2';
import { MdPayment } from 'react-icons/md';
import { RiShipFill } from 'react-icons/ri';
import StatisticsBox from './StatisticsBox';
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
      const status = useSearchParams().get('status') || 'none';
      const [recordx, setRecord] = useState<Record | null>(null);
      //const [recordx, setRecord] = useState<Record[]>([]);

      useEffect(() => {
        const fetchRecord = async () => {
          const res = await fetch(
            `/api/get-data/procurement-count?status=${status}`,
          );
          const data = await res.json();
          setRecord(data);
        };
        fetchRecord();
      }, []);

     
  const handleClick = (status: string) => {
    //alert(`You clicked on ${title}!`);
     router.push('/dashboard/procurement?status='+status)
  };

  return (
    <>

<div className="w-full overflow-x-auto scrollbar-hide scrollbar-thin">
      <div className="flex space-x-2 px-4 py-2">
        {/* Buttons with one-line text */}
        <button type="button" onClick={()=>handleClick('saved')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-120px">
          <span>Saved </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.savedOrderCount}</span>
        </button>
        <button type="button" onClick={()=>handleClick('pending')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-120px">
          <span>Pending </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.pendingOrderCount}</span>
        </button>
        <button type="button" onClick={()=>handleClick('approved')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-120px">
          <span>Approved </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.approvedOrderCount}</span>
        </button>
        <button type="button" onClick={()=>handleClick('pay-for-shipping')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-120px">
          <span>Pay for Shipping </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.payForShippingOrderCount}</span>
        </button>
        <button type="button" onClick={()=>handleClick('in-transit')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-120px">
          <span>In-Transit </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.inTransitOrderCount}</span>
        </button>
        <button type="button" onClick={()=>handleClick('ready-for-pickup')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-120px">
          <span className='flex'>Ready for Pickup </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.readyForPickupOrderCount}</span>
        </button>
        <button type="button" onClick={()=>handleClick('completed')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-120px">
          <span>Completed </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.completedOrdersCount}</span>
        </button>
        <button type="button" onClick={()=>handleClick('on-hold')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-120px">
          <span>On-Hold </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.onHoldOrdersCount}</span>
        </button>
        <button type="button" onClick={()=>handleClick('bank-pending-saved-orders')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-120px">
          <span>Bank Pending (Saved) </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.bankPendingSavedOrdersCount}</span>
        </button>
        <button type="button" onClick={()=>handleClick('bank-pending-shipping-orders')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-120px">
          <span>Bank Pending (Shipping) </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.bankPendingShippingOrdersCount}</span>
        </button>
        <button type="button" onClick={()=>handleClick('cancelled')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-120px">
          <span>Cancelled </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.cancelledOrdersCount}</span>
        </button>
      </div>
    </div>


    </>
  );
};

export default CounterBoxProcurement;
