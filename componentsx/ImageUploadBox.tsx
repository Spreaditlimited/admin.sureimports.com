"use client";
import { useState, useRef } from 'react';
import { PhotoIcon } from '@heroicons/react/16/solid';

const ImageUpload = () => {
  const [image, setImage] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = function (e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = function (e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImage(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`
                    flex flex-col items-center justify-center 
                    border-2 border-dashed rounded-md cursor-pointer bg-blue-50
                    ${dragActive ? "border-blue-500" : "border-gray-300"} 
                    h-48 w-80
                  `}
        >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept="image/*"
        />
        <PhotoIcon className="h-10 w-10 mr-2" />
        {!image ? (
          <p className='p-5'><b>Drag & drop your image here or click to select.</b></p>
        ) : (
          <img src={URL.createObjectURL(image)} alt="Preview" />
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
