import React, { useState, useRef, ChangeEvent } from 'react';
import Image from 'next/image';

interface ImageFileInputProps {
  onChange: (file: File | null) => void;
  label?: string;
  id?: string;
  name?: string;
  accept?: string;
  maxSizeMB?: number;
  reacticon?: any;
  className?: any;
}

const ImageFileInput: React.FC<ImageFileInputProps> = ({
  onChange,
  label = 'Upload Image',
  id = '',
  name = '',
  accept = 'image/*',
  maxSizeMB = 5,
  reacticon = '',
  className = '',
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);

    if (file) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File size should be less than ${maxSizeMB}MB`);
        onChange(null);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onChange(file);
    } else {
      setPreview(null);
      onChange(null);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-400">
        {label}
      </label>
      <div className="flex items-center space-x-4">
        <div
          //type="button"
          onClick={handleClick}
          className={'dark:bg-slate-800 ' + className}
          //className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <span
            className="relatived pt-5 text-2xl"
            style={{ color: '#404040' }}
          >
            {reacticon}
          </span>
          <span>Select Image</span>
        </div>
        {preview && (
          <div className="relative h-14 w-14">
            <Image
              src={preview}
              alt="Preview"
              layout="fill"
              objectFit="cover"
              className="rounded-md"
            />
          </div>
        )}
      </div>
      <input
        type="file"
        name={name}
        id={id}
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default ImageFileInput;
