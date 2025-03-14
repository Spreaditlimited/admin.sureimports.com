
import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import CounterBoxProcurement from './CounterBoxPaySupplier';
import CounterBoxPaySupplier from './CounterBoxPaySupplier';
import OrdersBoxProcurement from '../../../../../componentsx/dashboard/OrdersBoxProcurement';
import OrdersBoxPaySupplier from './OrdersBoxPaySupplier';

export const metadata: Metadata = {
    title: 'Dashboard',
};

const Page = () => {
    return (
        <div>

            <div className="">
                <div className="p-2">
                    <CounterBoxPaySupplier />
                </div>

                <div className="p-2">
                    <OrdersBoxPaySupplier />
                </div>
            </div>
            
        </div>
    );
};

export default Page;
