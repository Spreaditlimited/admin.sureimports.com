
import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import CounterBoxVerifySupplier from './CounterBoxVerifySupplier';
import OrdersBoxVerifySupplier from './OrdersBoxVerifySupplier';

export const metadata: Metadata = {
    title: 'Dashboard',
};

const Page = () => {
    return (
        <div>

            <div className="">
                <div className="p-2">
                    <CounterBoxVerifySupplier />
                </div>

                <div className="p-2">
                    <OrdersBoxVerifySupplier />
                </div>
            </div>
            
        </div>
    );
};

export default Page;
