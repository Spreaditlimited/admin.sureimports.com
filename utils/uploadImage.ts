'use server';

import { random } from 'lodash';
import { getR2Client } from './r2Client';
import { Upload } from '@aws-sdk/lib-storage';
import getFileExt from '@/app/utils/fileExt';
import validFile from '@/app/utils/fileValidation';

//////////////////// IMAGE UPLOAD ////////////////////
export async function uploadImage(formData: FormData) {
  //GET FILE FROM FROM
  const file = formData.get('file') as File;

  //CHECK IF FILE IS UPLOADED
  if (!file) {
    throw new Error('No file uploaded');
  }

  //SET FILE NAME & GET FILE PARAMS
  const originalFileName = file.name;
  const fileType = file.type;
  const fileExt = getFileExt(originalFileName);
  const fileSize = file.size;
  const newImageName = 'img_' + random(9999999999);

  const check = await validFile(fileExt).success;

  // console.log(check); return null;

  try {
    //GET FILE PAYLOAD
    const buffer = await file.arrayBuffer();

    //FILE UPLOAD DETAILS
    const upload = new Upload({
      client: getR2Client(),
      params: {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: newImageName,
        Body: Buffer.from(buffer),
        ContentType: fileType,
      },
    });

    //UPLOAD FILE
    await upload.done();

    //RETURN SUCCESS ON FILE UPLOAD
    return { success: true, message: 'File uploaded successfully' };
  } catch (error) {
    //CATCH ANY ERRORS ON FAILED UPLOAD
    console.error('Error uploading file:', error);
    return { success: false, message: 'Error uploading file' };
  }
}
