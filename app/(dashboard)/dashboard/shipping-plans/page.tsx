import PageX from './components/PageTitle';
import ViewShippingPlan from './components/ViewShippingPlan';
import { Metadata } from 'next';
import React from 'react';
import { CountryDataFetcher } from "./components/CountryDataFetcher"
import { CountryTable } from "./components/CountryTable"
import { DashboardLayout } from '../components/dashboard-layout';

export const metadata: Metadata = {
    title: 'Printin Admin Dashboard',
    description: 'Printin'
};
  
  
const Page = async () => {

    const countries = await CountryDataFetcher()
    return (
        <DashboardLayout>
        <h1 className="text-2xl font-bold mb-6">Shipping Plan</h1>
        {/* <AdminForm /> */}
    </DashboardLayout>
    );
};

export default Page;
