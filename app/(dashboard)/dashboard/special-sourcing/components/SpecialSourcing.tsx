

import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import CounterBoxSpecialSourcing from './CounterBoxSpecialSourcing';
import OrdersBoxSpecialSourcing from './OrdersBoxSpecialSourcing';

export const metadata: Metadata = {
    title: 'Dashboard',
};

const Page = () => {
    return (
        <div>

            <div className="">
                <div className="p-2">
                    <CounterBoxSpecialSourcing />
                </div>

                <div className="p-2">
                    <OrdersBoxSpecialSourcing />
                </div>
            </div>
            
        </div>
    );
};

export default Page;
