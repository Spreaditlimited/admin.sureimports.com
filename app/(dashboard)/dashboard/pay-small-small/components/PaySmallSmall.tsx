
import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import CounterBoxPaySmallSmall from './CounterBoxPaySmallSmall';
import OrdersBoxPaySmallSmall from './OrdersBoxPaySmallSmall';

export const metadata: Metadata = {
    title: 'Dashboard',
};

const Page = () => {
    return (
        <div>

            <div className="">
                <div className="p-2">
                    <CounterBoxPaySmallSmall />
                </div>

                <div className="p-2">
                    <OrdersBoxPaySmallSmall />
                </div>
            </div>
            
        </div>
    );
};

export default Page;
