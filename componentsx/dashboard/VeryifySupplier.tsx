import ComponentsFormsSelectBasic from '@/components/forms/select2/components-forms-select-basic';
import ComponentsFormsSelectDisablingOptions from '@/components/forms/select2/components-forms-select-disabling-options';
import ComponentsFormsSelectMultiselect from '@/components/forms/select2/components-forms-select-multiselect';
import ComponentsFormsSelectNested from '@/components/forms/select2/components-forms-select-nested';
import ComponentsFormsSelectPlaceholder from '@/components/forms/select2/components-forms-select-placeholder';
import ComponentsFormsSelectSearchable from '@/components/forms/select2/components-forms-select-searchable';
import IconBell from '@/components/icon/icon-bell';
import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import CounterBoxProcurement from './CounterBoxVerifySupplier';
import CounterBoxVerifySupplier from './CounterBoxVerifySupplier';
import OrdersBoxProcurement from './OrdersBoxProcurement';
import OrdersBoxVerifySupplier from './OrdersBoxVerifySupplier';

export const metadata: Metadata = {
    title: 'Dashboard',
};

const Page = () => {
    return (
        <div>

            <div className="space-y-8 pt-5">
                <div className="panel flex items-center overflow-x-auto whitespace-nowrap p-3 text-dark">
                    <span className='text-xl'><b>Verify Supplier</b></span>
                </div>
                
                <div className="p-5">
                    <CounterBoxVerifySupplier />
                </div>

                <div className="p-5">
                    <OrdersBoxVerifySupplier />
                </div>
            </div>
            
        </div>
    );
};

export default Page;
