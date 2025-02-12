'use client'

import { useRouter } from "next/navigation";

const Home: React.FC = () => {  
  const router = useRouter();  
  
    router.push('/dashboard'); // Navigate to the home page  
    return null;
};  

export default Home;