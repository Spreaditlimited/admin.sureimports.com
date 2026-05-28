import { Metadata } from 'next';
import React from 'react';
import EditBlogForm from '@/app/(dashboard)/dashboard/blog/components/EditBlogForm';

export const metadata: Metadata = {
  title: 'Manuscript Revision | Admin Dashboard',
  description: 'Modify editorial content, update SEO metadata, and synchronize publication states.',
};

const Page = () => {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Manuscript Revision
        </h1>
        <p className="text-sm text-muted-foreground">
          Update your editorial content. Ensure all modifications align with current brand voice and SEO strategy before re-publishing.
        </p>
      </div>

      {/* Editorial Workspace */}
      <div className="pt-2">
        <EditBlogForm />
      </div>
      
    </div>
  );
};

export default Page;