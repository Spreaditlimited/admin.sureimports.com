import { Metadata } from 'next';
import React from 'react';
import CounterBoxShippingOnly from './CounterBoxShippingOnly';
import OrdersBoxShippingOnly from './OrdersBoxShippingOnly';
import CreateShippingOnlyRequest from './CreateShippingOnlyRequest';

export const metadata: Metadata = {
    title: 'Freight Provisioning Ledger | Admin Dashboard',
    description: 'Standalone freight management and logistics tracking ledger.'
};

const Page = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            
            <div className="flex justify-end px-1">
                <CreateShippingOnlyRequest />
            </div>

            {/* 1. Global Logistics Pulse */}
            <div className="px-1">
                <CounterBoxShippingOnly />
            </div>

            {/* 2. Active Freight Ledger */}
            <div className="pt-2">
                <OrdersBoxShippingOnly />
            </div>
            
        </div>
    );
};

export default Page;
