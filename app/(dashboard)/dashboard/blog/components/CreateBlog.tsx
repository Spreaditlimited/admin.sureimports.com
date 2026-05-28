import { Metadata } from 'next';
import React from 'react';
import CreateBlogForm from './CreateBlogForm';

export const metadata: Metadata = {
    title: 'Editorial Composer | Admin Dashboard',
    description: 'Draft and curate high-fidelity editorial content for the global platform.'
};

const Page = () => {
    return (
        <div className="space-y-6">

            {/* 2. Composer Workspace */}
            <div className="pt-2">
                <CreateBlogForm />
            </div>
            
        </div>
    );
};

export default Page;
