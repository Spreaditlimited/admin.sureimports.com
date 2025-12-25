import EditBlogForm from '@/app/(dashboard)/dashboard/blog/components/EditBlogForm'
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Edit Blog Post | Admin Dashboard',
    description: 'Edit Blog Post'
};

const Page = () => {
    return <EditBlogForm />;
};

export default Page;
