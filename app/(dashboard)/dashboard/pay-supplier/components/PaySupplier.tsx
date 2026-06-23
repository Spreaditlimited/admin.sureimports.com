import React from 'react';
import CounterBoxPaySupplier from './CounterBoxPaySupplier';
import OrdersBoxPaySupplier from './OrdersBoxPaySupplier';

const PaySupplier = () => {
    return (
        <div className="space-y-6">
            <div>
                <CounterBoxPaySupplier />
            </div>

            <div>
                <OrdersBoxPaySupplier />
            </div>
            
        </div>
    );
};

export default PaySupplier;
