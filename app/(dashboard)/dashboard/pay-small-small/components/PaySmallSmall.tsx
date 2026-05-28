import { Metadata } from 'next';
import React from 'react';
import CounterBoxPaySmallSmall from './CounterBoxPaySmallSmall';
import OrdersBoxPaySmallSmall from './OrdersBoxPaySmallSmall';

export const metadata: Metadata = {
    title: 'Pay Small Small | Admin Dashboard',
};

const PaySmallSmallPage = () => {
    return (
        // Replaced the fragmented p-2 wrappers with our unified space-y-6 layout
        <div className="space-y-6">
            
            <div>
                <CounterBoxPaySmallSmall />
            </div>

            <div>
                <OrdersBoxPaySmallSmall />
            </div>
            
        </div>
    );
};

export default PaySmallSmallPage;