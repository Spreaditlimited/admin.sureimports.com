import { Metadata } from 'next';
import React from 'react';
import ViewBlog from '@/app/(dashboard)/dashboard/blog/components/ViewBlog';

export const metadata: Metadata = {
  title: 'Editorial Archive | Admin Dashboard',
  description: 'View, audit, and manage published manuscripts across the platform editorial channels.',
};

const Page = () => {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Editorial Archive
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage the global content library. Audit publication states, track author performance, and synchronize editorial metadata.
        </p>
      </div>

      {/* Archive Workspace */}
      <div className="pt-2">
        <ViewBlog />
      </div>
      
    </div>
  );
};

export default Page;