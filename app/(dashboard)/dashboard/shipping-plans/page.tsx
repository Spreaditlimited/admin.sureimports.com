import { Metadata } from 'next';
import React from 'react';
import ViewShippingPlan from './components/ViewShippingPlan';
import { CountryDataFetcher } from "./components/CountryDataFetcher";
import { CountryTable } from "./components/CountryTable";

export const metadata: Metadata = {
    title: 'Shipping Plans | Admin Dashboard',
    description: 'Configure global shipping logistics and country-specific rates.'
};

const Page = async () => {
    // Fetch country data at the server level
    const countries = await CountryDataFetcher();

    return (
        <div className="space-y-6">
            
            {/* 1. Page Header */}
            <div className="flex flex-col gap-1 px-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Shipping Plans & Logistics
                </h1>
                <p className="text-sm text-muted-foreground">
                    Manage global shipping destinations, regional pricing models, and delivery timeframes.
                </p>
            </div>

            {/* 2. Global Overview / Plan Configuration */}
            <ViewShippingPlan />

            {/* 3. Regional Breakdown & Country Management */}
            <div className="pt-2">
                <CountryTable countries={countries} />
            </div>
            
        </div>
    );
};

export default Page;