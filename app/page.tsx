'use client'

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const Home = () => {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard'); // Navigate to the dashboard page
  }, [router]);

  return null; // Render nothing
};

export default Home;