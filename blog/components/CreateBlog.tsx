
//import IconBell from '@/components/icon/icon-bell';
import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import CreateBlogForm from './CreateBlogForm';

export const metadata: Metadata = {
    title: 'Create Blog',
};

const Page = () => {
    return (
        <div>

            <div className="space-y-8 pt-5">
                <div className="panel flex items-center overflow-x-auto whitespace-nowrap p-3 text-dark">
                    <span className='text-xl'><b> Create Blog Post</b></span>
                </div>
                <div className="custom-select grid grid-cols-1 gap-6 lg:grid-cols-1">
                    {/* Basic */}
                    <CreateBlogForm />

                </div>
            </div>
            
        </div>
    );
};

export default Page;
