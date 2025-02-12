

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

            <div className="space-y-8 pt-5">
                <div className="panel flex items-center overflow-x-auto whitespace-nowrap p-3 text-dark">
                    <span className='text-xl'><b>Special Sourcing</b></span>
                </div>
                
                <div className="p-5">
                    <CounterBoxSpecialSourcing />
                </div>

                <div className="p-5">
                    <OrdersBoxSpecialSourcing />
                </div>
            </div>
            
        </div>
    );
};

export default Page;
