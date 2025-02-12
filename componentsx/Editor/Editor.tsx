import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

const Editor = () => {
  const [value, setValue] = useState('');

  return <ReactQuill  />;
};

export default Editor;