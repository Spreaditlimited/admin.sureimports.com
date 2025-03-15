import ViewBlog from '@/app/(dashboard)/dashboard/blog/components/ViewBlog'
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Printin Admin Dashboard',
    description: 'Printin'
};

const Page = () => {
    return <ViewBlog />;
};

export default Page;
