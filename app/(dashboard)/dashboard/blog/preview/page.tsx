import type { Metadata } from 'next';
import BlogPreview from '@/app/(dashboard)/dashboard/blog/components/BlogPreview';

export const metadata: Metadata = {
  title: 'Blog Preview | Admin Dashboard',
  description: 'Preview a blog post before or after public publication.',
};

export default function Page() {
  return <BlogPreview />;
}
