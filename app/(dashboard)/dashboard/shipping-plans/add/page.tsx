
import { Metadata } from 'next';
import React from 'react';
import AddShippingPlan from '../components/AddShippingPlan';
import { CountryDataFetcher } from "../dataFetcher/CountryDataFetcher"
import { CountryTable } from "../components/CountryTable"
import { DashboardLayout } from '../../components/dashboard-layout';

export const metadata: Metadata = {
    title: 'Printin Admin Dashboard',
    description: 'Printin'
};

const Page = async () => {

    const countries = await CountryDataFetcher() as any;
    return (
            <>
                <DashboardLayout>
                    <h1 className="text-2xl font-bold mb-6">Shipping Plan</h1>
                    <AddShippingPlan initialData={countries} />
                    {/* <PageTitle title="Add Shipping Plan"  /> */}
                    <CountryTable countries={countries} />
                    
                </DashboardLayout>
            </>
           );
};

export default Page;
