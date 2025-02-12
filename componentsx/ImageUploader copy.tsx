'use client'

import React, { useState } from 'react';
import { uploadImage } from '@/app/utils/uploadImage';
import R2Image from '@/componentsx/R2Image';
import Image from 'next/image';
import ImageUploadBox from '@/componentsx/ImageUploadBox';


const ImageUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await uploadImage(formData);
      setStatus(result.message);
    } catch (error) {
      console.error('Error uploading image:', error);
      setStatus('Error uploading image');
    }
  };

  return (
<>
{/* <div>
    <h1>My R2 Image</h1>
    <R2Image
      fileName="box"
      alt="Example image from R2"
      width={200}
      height={200}
    />
  </div> */}


    <form onSubmit={handleSubmit}>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {/* <ImageUploadBox /> */}
      <button type="submit" disabled={!file}>
        Upload
      </button>
      {status && <p>{status}</p>}
    </form>
</>    
  );


};

export default ImageUploader;