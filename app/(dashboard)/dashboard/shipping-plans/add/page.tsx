
import { Metadata } from 'next';
import React from 'react';
import AddShippingPlan from '../components/AddShippingPlan';
import { CountryDataFetcher } from "../dataFetcher/CountryDataFetcher"
import { CountryTable } from "../components/CountryTable"

export const metadata: Metadata = {
    title: 'Printin Admin Dashboard',
    description: 'Printin'
};

const Page = async () => {

    const countries = await CountryDataFetcher() as any;
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold mb-6">Shipping Plan</h1>
        <AddShippingPlan />
        <CountryTable countries={countries} />
      </div>
           );
};

export default Page;
