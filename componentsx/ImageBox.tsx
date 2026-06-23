'use client';

import { PhotoIcon } from '@heroicons/react/16/solid';
import React, { useState, ChangeEvent, DragEvent } from 'react';

interface ImageUploadProps {
  onImageChange: (file: File) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageChange }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPreviewImage(URL.createObjectURL(file));
      onImageChange(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      setPreviewImage(URL.createObjectURL(file));
      onImageChange(file);
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      // style={{
      //   border: isDragOver ? '2px dashed blue' : '1px solid gray',
      //   padding: '20px',
      //   textAlign: 'center',
      //   cursor: 'pointer',
      // }}
      className={`
        flex flex-col items-center justify-center w-200 h-250 relative dark:bg-slate-600
        border-2 border-dashed rounded-md cursor-pointer bg-blue-50
        ${isDragOver ? "border-blue-500" : "border-gray-300"} 
        h-70 w-80
      `}
    >
      
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageChange}
        style={{ display: 'none' }}
      />
      <PhotoIcon className="h-20 w-10 mr-2 dark:text-gray-600" />
      {previewImage ? (
        <img src={previewImage} alt="Preview" style={{ maxWidth: '300px' }} className='absolute w-full h-full object-contain border-solid border-4 border-gray-300 rounded-xl' />
      ) : (
        <p className='p-10 m-10 dark:text-gray-600'>Click or drag and drop an image to upload</p>
      )}
    </div>
  );
};

export default ImageUpload;
