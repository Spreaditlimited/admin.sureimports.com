'use client';

import { PhotoIcon } from '@heroicons/react/16/solid';
import React, { useState, ChangeEvent, DragEvent } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  onImageChange: (file: File) => void;
  imagex: any;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageChange, imagex }) => {
  //const [previewImage, setPreviewImage] = useState<string | null>('/icons/profile-update/default.png');
  if (imagex == null || imagex == undefined || imagex == '') {
    imagex = 'default2.png';
  } //set default image value
  const url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL + '/' + imagex;
  const [previewImage, setPreviewImage] = useState<string | null>(url);
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
      //   style={{
      //     border: isDragOver ? '2px dashed blue' : '1px solid gray',
      //     padding: '20px',
      //     textAlign: 'center',
      //     cursor: 'pointer',
      //   }}
      className={` ${isDragOver ? 'border-blue-500' : 'border-gray-300'} `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        style={{ display: 'none' }}
      />
      {/* <PhotoIcon className="h-10 w-10 mr-2" /> */}

      {previewImage ? (
        <>
          <div className="flex flex-col items-center justify-center rounded-lg pb-6 pt-5">
            <Image
              src={previewImage}
              alt="Preview"
              width={400}
              height={200}
              className="m-8 flex max-h-[250px] w-auto flex-col items-center justify-center rounded-lg object-contain pb-3 pt-3"
              style={{ maxWidth: '250px', maxHeight: '250px' }}
            />
          </div>
          {/* <p className='p-5 m-2 pb-2 text-[14px]'>Click or drag and drop an image to upload <br />        
          <div className=' pb-2 text-[10px]'>Max image size 2.5MB (Use a square sized photo e.g. 150px
            x 150px for best fit.)
          </div> 
        </p> */}
        </>
      ) : (
        <>
          {/* <p className='p-5 m-2 pb-2 text-[14px]'>Click or drag and drop an image to upload <br />        
            <div className=' pb-2 text-[10px]'>Max image size 2.5MB (Use a square sized photo e.g. 150px
              x 150px for best fit.)
            </div> 
          </p> */}
        </>
      )}
    </div>
  );
};

export default ImageUpload;
