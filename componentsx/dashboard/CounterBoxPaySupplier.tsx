'use client'

import React, { useEffect, useState } from 'react';
import { BiSolidShoppingBags, BiUser } from 'react-icons/bi';
import { HiShoppingBag } from 'react-icons/hi2';
import { MdPayment } from 'react-icons/md';
import { RiShipFill } from 'react-icons/ri';
import StatisticsBox from './StatisticsBox';
import { useRouter, useSearchParams } from 'next/navigation';


interface Record {
  savedOrder: number;
  paymentPendingOrder: number;
  paidSupplierOrder: number;
  cancelledOrder: number;
}


const CounterBoxProcurement = () => {
  const router = useRouter();
  const status = useSearchParams().get('status') || 'none';
  const [recordx, setRecord] = useState<Record | null>(null);
  //const [recordx, setRecord] = useState<Record[]>([]);

  useEffect(() => {
    const fetchRecord = async () => {
      const res = await fetch(
        `/api/get-data/pay-supplier-count?status=${status}`,
      );
      const data = await res.json();
      setRecord(data);
    };
    fetchRecord();
  }, []);

 
const handleClick = (status: string) => {
//alert(`You clicked on ${title}!`);
 router.push('/dashboard/pay-supplier?status='+status)
};

  return (
    <>

<div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex space-x-2 px-4 py-2">
        {/* Buttons with one-line text */}
        <button type="button" onClick={()=>handleClick('saved')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-[120px]">
          <span>Saved Payment </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.savedOrder}</span>
        </button>
        <button type="button" onClick={()=>handleClick('bank-pending')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-[120px]">
          <span>Bank Pending </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.paymentPendingOrder}</span>
        </button>
        <button type="button" onClick={()=>handleClick('paid-supplier')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-[120px]">
          <span>Paid Supplier </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.paidSupplierOrder}</span>
        </button>
        <button type="button" onClick={()=>handleClick('request-cancelled')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-[120px]">
          <span>Request Cancelled </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.cancelledOrder}</span>
        </button>
        
      </div>
    </div>


    </>
  );
};

export default CounterBoxProcurement;
