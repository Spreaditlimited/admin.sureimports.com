import { useRouter } from 'next/navigation';
import { FC } from 'react';
//import { Button } from '../ui/button';

interface BackButtonProps {
  className?: string;
}

const BackButton: FC<BackButtonProps> = ({ className = '' }) => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <button
      onClick={handleBack}
      className={`mt-8 h-14 rounded px-4 py-3.5 ${className}`}
    >
      Back
    </button>
  );
};

export default BackButton;
