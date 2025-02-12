
import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import CounterBoxShippingOnly from './CounterBoxShippingOnly';
import OrdersBoxProcurement from './OrdersBoxProcurement';
import OrdersBoxShippingOnly from './OrdersBoxShippingOnly';

export const metadata: Metadata = {
    title: 'Dashboard',
};

const Page = () => {
    return (
        <div>

            <div className="space-y-8 pt-5">
                <div className="panel flex items-center overflow-x-auto whitespace-nowrap p-3 text-dark">
                    <span className='text-xl'><b>Shipping Only</b></span>
                </div>
                
                <div className="p-5">
                    <CounterBoxShippingOnly />
                </div>

                <div className="p-5">
                    <OrdersBoxShippingOnly />
                </div>
            </div>
            
        </div>
    );
};

export default Page;
