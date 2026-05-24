import { getCloudinary } from '@/lib/cloudinary/config';

type UploadOptions = {
  folder: string;
  publicId?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  overwrite?: boolean;
  useFilename?: boolean;
  uniqueFilename?: boolean;
  tags?: string[];
};

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
  originalFilename: string;
};

export async function uploadBufferToCloudinary(
  fileBuffer: Buffer,
  options: UploadOptions,
): Promise<CloudinaryUploadResult> {
  const cloudinary = getCloudinary();

  const uploadResult: any = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: options.resourceType || 'image',
        overwrite: options.overwrite ?? false,
        use_filename: options.useFilename ?? true,
        unique_filename: options.uniqueFilename ?? true,
        tags: options.tags,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );

    stream.end(fileBuffer);
  });

  const secureUrl = String(uploadResult?.secure_url || '').trim();
  const publicId = String(uploadResult?.public_id || '').trim();

  if (!secureUrl || !publicId) {
    throw new Error('Cloudinary upload failed');
  }

  return {
    url: secureUrl,
    publicId,
    resourceType: String(uploadResult?.resource_type || ''),
    format: String(uploadResult?.format || ''),
    bytes: Number(uploadResult?.bytes || 0),
    originalFilename: String(uploadResult?.original_filename || ''),
  };
}
