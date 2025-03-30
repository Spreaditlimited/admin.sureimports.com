// components/CKEditorWrapper.tsx
import dynamic from 'next/dynamic';
import React from 'react';

interface CKEditorWrapperProps {
  data: string;
  onChange: (data: string) => void;
  disabled?: boolean;
}

// Dynamically import the CKEditor component with no SSR
const CKEditorWrapper = dynamic(
  () => import('./CKEditor'),
  { 
    ssr: false,
    loading: () => <p>Loading editor...</p>
  }
);

export default CKEditorWrapper;