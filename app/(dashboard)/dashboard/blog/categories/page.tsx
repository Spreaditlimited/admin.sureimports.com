import BlogCategories from '../components/BlogCategories';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog Categories - Admin Dashboard',
  description: 'Manage blog categories',
};

const Page = () => {
  return <BlogCategories />;
};

export default Page;
