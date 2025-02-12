'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { toast, Toaster } from 'sonner';

interface AlertContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const showSuccess = (message: string) => toast.success(message);
  const showError = (message: string) => toast.error(message);
  const showInfo = (message: string) => toast.info(message);

  return (
    <AlertContext.Provider value={{ showSuccess, showError, showInfo }}>
      {children}
      <Toaster position="top-right" expand={true} richColors />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
