'use client'

import React, { useEffect, useState } from 'react';
import { BiSolidShoppingBags, BiUser } from 'react-icons/bi';
import { HiShoppingBag } from 'react-icons/hi2';
import { MdPayment } from 'react-icons/md';
import { RiShipFill } from 'react-icons/ri';
import StatisticsBox from '../../../../../componentsx/dashboard/StatisticsBox';
import { useRouter, useSearchParams } from 'next/navigation';


interface Record {
  requestReceivedOrder: number;
  readyToShipOrder: number;
  productShippedOrder: number;
  productArrivedOrder: number;
  productDeliveredOrder: number;
  cancelledRequestOrder: number;
}


const CounterBoxShippingOnly = () => {
  const router = useRouter();
  const status = useSearchParams().get('status') || 'none';
  const [recordx, setRecord] = useState<Record | null>(null);
  //const [recordx, setRecord] = useState<Record[]>([]);

useEffect(() => {
const fetchRecord = async () => {
  const res = await fetch(
    `/api/get-data/shipping-only-count?status=${status}`,
  );
  const data = await res.json();
  setRecord(data);
};
fetchRecord();
}, []);


const handleClick = (status: string) => {
//alert(`You clicked on ${title}!`);
router.push('/dashboard/shipping-only?status='+status)
};


  return (
    <>

<div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex space-x-2 px-4 py-2">

        {/* Buttons with one-line text */}
        <button type="button" onClick={()=>handleClick('request-received')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-[120px]">
          <span>Saved </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.requestReceivedOrder}</span>
        </button>
        <button type="button" onClick={()=>handleClick('ready-to-ship')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-[120px]">
          <span>Pending </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.readyToShipOrder}</span>
        </button>
        <button type="button" onClick={()=>handleClick('product-shipped')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-[120px]">
          <span>Approved </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.productShippedOrder}</span>
        </button>
        <button type="button" onClick={()=>handleClick('product-arrived')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-[120px]">
          <span>Pay for Shipping </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.productArrivedOrder}</span>
        </button>
        <button type="button" onClick={()=>handleClick('product-delivered')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-[120px]">
          <span>In-Transit </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.productDeliveredOrder}</span>
        </button>
        <button type="button" onClick={()=>handleClick('cancelled-request')} className="whitespace-nowrap btn btn-dark my-4 bg-indigo-700 text-white px-3 py-1 text-sm rounded-full hover:bg-indigo-800 flex items-center justify-between min-w-[120px]">
          <span className='flex'>Ready for Pickup </span>&nbsp;&nbsp;
          <span className="bg-gray-100 text-black text-xs font-bold rounded-full px-2 py-0.5">{recordx?.cancelledRequestOrder}</span>
        </button>

      </div>
    </div>


    </>
  );
};

export default CounterBoxShippingOnly;
