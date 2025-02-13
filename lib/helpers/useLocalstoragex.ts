"use client";
import { useState, useEffect } from 'react';

export function useLocalStorage(key: string, initialValue: string | null = null) {
  const [value, setValue] = useState<string | null>(initialValue);

  useEffect(() => {
    // Check if running in the browser before accessing localStorage
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem(key);
      setValue(storedValue !== null ? storedValue : initialValue);
    }
  }, [key]);

  const updateValue = (newValue: string | null) => {
    setValue(newValue);
    if (typeof window !== 'undefined') {
      if (newValue === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, newValue);
      }
    }
  };

  return [value, updateValue];
}
