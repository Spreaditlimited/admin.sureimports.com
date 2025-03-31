'use client';

import { useRef, useEffect, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { useTheme } from 'next-themes'; // For theme detection

interface RichTextEditorProps {
  initialValue?: string;
  onChange?: (content: string) => void;
  apiKey: string;
}

export default function RichTextEditor({
  initialValue = '',
  onChange,
  apiKey,
}: RichTextEditorProps) {
  const editorRef = useRef<any>(null);
  const { theme } = useTheme(); // Get current theme
  const [mounted, setMounted] = useState(false);

  // Ensure we only render after mounting to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Theme-aware editor configuration
  const editorConfig = {
    height: 500,
    menubar: true,
    skin: theme === 'dark' ? 'oxide-dark' : 'oxide',
    content_css: theme === 'dark' ? 'dark' : 'default',
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount', 'emoticons'
    ],
    toolbar: 'undo redo | blocks | ' +
      'bold italic forecolor | alignleft aligncenter ' +
      'alignright alignjustify | bullist numlist outdent indent | ' +
      'removeformat | help | image | table | emoticons | code',
    content_style: mounted 
      ? `body { 
          font-family:Helvetica,Arial,sans-serif; 
          font-size:14px; 
          background: ${theme === 'dark' ? '#1e293b' : '#fff'}; 
          color: ${theme === 'dark' ? '#f8fafc' : '#1e293b'};
        }`
      : '',
    images_upload_handler: async (blobInfo: any, progress: any) => {
      // Your image upload handler
    },
  };

  // Load TinyMCE script
  useEffect(() => {
    if (!mounted) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.tiny.cloud/1/' + apiKey + '/tinymce/6/tinymce.min.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [apiKey, mounted]);

  if (!mounted) {
    return <div className="h-[500px] w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded"></div>;
  }

  return (
    <div className="rich-text-editor">
      <Editor
        apiKey={apiKey}
        onInit={(evt, editor) => (editorRef.current = editor)}
        initialValue={initialValue}
        init={editorConfig}
        onEditorChange={onChange}
      />
    </div>
  );
}