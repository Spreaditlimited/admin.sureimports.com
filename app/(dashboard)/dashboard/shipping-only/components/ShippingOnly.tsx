
import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import CounterBoxShippingOnly from './CounterBoxShippingOnly';
import OrdersBoxShippingOnly from './OrdersBoxShippingOnly';

export const metadata: Metadata = {
    title: 'Dashboard',
};

const Page = () => {
    return (
        <div>

            <div className="">
                
                <div className="p-2">
                    <CounterBoxShippingOnly />
                </div>

                <div className="p-2">
                    <OrdersBoxShippingOnly />
                </div>
            </div>
            
        </div>
    );
};

export default Page;
