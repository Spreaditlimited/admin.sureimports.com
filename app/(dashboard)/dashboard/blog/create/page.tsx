import { Metadata } from 'next';
import CreateBlog from '@/app/(dashboard)/dashboard/blog/components/CreateBlog';

export const metadata: Metadata = {
  title: 'Editorial Composer | Admin Dashboard',
  description: 'Draft, format, and publish high-fidelity editorial content to the global platform.',
};

const Page = () => {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Editorial Composer
        </h1>
        <p className="text-sm text-muted-foreground">
          Draft and curate your manuscript. Ensure SEO metadata and high-resolution media are optimized before publication.
        </p>
      </div>

      {/* Main Composer Workspace */}
      <div className="pt-2">
        <CreateBlog />
      </div>
      
    </div>
  );
};

export default Page;