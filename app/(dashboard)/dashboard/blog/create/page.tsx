import CreateBlog from '@/app/(dashboard)/dashboard/blog/components/CreateBlog'
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Printin Admin Dashboard',
    description: 'Printin'
};

const Page = () => {
    return <CreateBlog />;
};

export default Page;
