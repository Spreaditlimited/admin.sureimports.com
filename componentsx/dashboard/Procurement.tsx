
import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import CounterBoxProcurement from './CounterBoxProcurement';
import OrdersBoxProcurement from './OrdersBoxProcurement';

export const metadata: Metadata = {
    title: 'Dashboard',
};

const Page = () => {
    return (
        <div>

            <div className="space-y-8 pt-5">

                <div className="panel flex items-center overflow-x-auto whitespace-nowrap p-3 text-dark">
                    <span className='text-xl'><b>Procurement</b></span>
                </div>
                   
                <div className="p-5">
                    <CounterBoxProcurement />
                </div>
  
                <div className="p-5">
                    <OrdersBoxProcurement />
                </div>
                
            </div>
            
        </div>
    );
};

export default Page;


