'use client';

import { useRouter } from 'next/navigation';
import { useAlert } from '@/app/context/AlertContext';

export const useNavigationWithAlert = () => {
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useAlert();

  const navigateWithAlert = (
    path: string,
    alertType: 'success' | 'error' | 'info',
    message: string,
  ) => {
    router.push(path);

    setTimeout(() => {
      switch (alertType) {
        case 'success':
          showSuccess(message);
          break;
        case 'error':
          showError(message);
          break;
        case 'info':
          showInfo(message);
          break;
      }
    }, 100);
  };

  return navigateWithAlert;
};
