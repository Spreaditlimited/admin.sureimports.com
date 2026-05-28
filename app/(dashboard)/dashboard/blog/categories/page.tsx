import { Metadata } from 'next';
import BlogCategories from '../components/BlogCategories';

export const metadata: Metadata = {
  title: 'Blog Taxonomy | Admin Dashboard',
  description: 'Manage and classify blog content categories for optimized SEO and discoverability.',
};

const Page = () => {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Blog Taxonomy
        </h1>
        <p className="text-sm text-muted-foreground">
          Organize and classify your content library to improve discoverability, navigation, and SEO performance.
        </p>
      </div>

      {/* Main Content Workspace */}
      <BlogCategories />
      
    </div>
  );
};

export default Page;