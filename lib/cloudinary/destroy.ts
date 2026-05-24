import { getCloudinary } from '@/lib/cloudinary/config';

type DestroyOptions = {
  resourceType?: 'image' | 'video' | 'raw';
  invalidate?: boolean;
};

export async function destroyCloudinaryAsset(
  publicId: string,
  options: DestroyOptions = {},
) {
  const value = String(publicId || '').trim();
  if (!value) {
    return { result: 'not_found' as const };
  }

  const cloudinary = getCloudinary();

  const response: any = await cloudinary.uploader.destroy(value, {
    resource_type: options.resourceType || 'image',
    invalidate: options.invalidate ?? true,
  });

  return response;
}
