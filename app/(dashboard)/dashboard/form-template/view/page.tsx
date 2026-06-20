
import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import FormLayout from '../components/FormLayout';
import FormElements from '../components/FormElements';
import Table from '../components/TableLayout';
import Table2 from '../components/TableLayout2';
import Table3 from '../_components/TableLayout3';

export const metadata: Metadata = {
    title: 'Form Templates | Admin Dashboard',
};

// Define the type for table data
type TableData = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
  };

const Page = () => {

    // Sample data for the table
const initialData: TableData[] = [
    { id: 1, name: "EmJohn Doe", email: "john.doe@example.com", role: "Developer", status: "Active" },
    { id: 2, name: "Jane Smith", email: "jane.smith@example.com", role: "Designer", status: "Inactive" },
    { id: 3, name: "Alice Johnson", email: "alice.johnson@example.com", role: "Manager", status: "Active" },
    { id: 4, name: "Bob Brown", email: "bob.brown@example.com", role: "Developer", status: "Active" },
    { id: 5, name: "Charlie Davis", email: "charlie.davis@example.com", role: "Tester", status: "Inactive" },
    { id: 6, name: "David Wilson", email: "david.wilson@example.com", role: "Developer", status: "Active" },
    { id: 7, name: "Eva Green", email: "eva.green@example.com", role: "Designer", status: "Inactive" },
    { id: 8, name: "Frank White", email: "frank.white@example.com", role: "Manager", status: "Active" },
    { id: 9, name: "Grace Black", email: "grace.black@example.com", role: "Developer", status: "Active" },
    { id: 10, name: "Henry Brown", email: "henry.brown@example.com", role: "Tester", status: "Inactive" },
  ];
  
    return (
        <div>

            <div className="space-y-8 pt-5">

                <div className="panel flex items-center overflow-x-auto whitespace-nowrap p-3 text-dark">
                    <span className='text-xl'><b> Page Title </b></span>
                </div>

                <div className="custom-select grid grid-cols-1 gap-6 lg:grid-cols-1">
                    <FormLayout />
                        <FormElements />
                            <Table3 initialData={initialData}  />
                        <Table2 />
                    <Table />
                </div>

            </div>
            
        </div>
    );
};

export default Page;
