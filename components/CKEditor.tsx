// components/CKEditor.tsx
'use client'; // Required for Next.js 13+ App Router

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import React from 'react';

interface CKEditorProps {
  data: string;
  onChange: (data: string) => void;
  disabled?: boolean;
}

const CustomCKEditor: React.FC<CKEditorProps> = ({ data, onChange, disabled }) => {
  return (
    <CKEditor
      editor={ClassicEditor}
      data={data}
      onChange={(event: any, editor: any) => {
        const data = editor.getData();
        onChange(data);
      }}
      disabled={disabled}
      config={{
        toolbar: [
          'heading', '|',
          'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', '|',
          'undo', 'redo'
        ]
      }}
    />
  );
};

export default CustomCKEditor;