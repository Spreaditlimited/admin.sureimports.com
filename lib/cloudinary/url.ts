type TransformOptions = {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'limit' | 'thumb';
  quality?: 'auto' | number;
  format?: 'auto' | 'webp' | 'jpg' | 'png' | 'avif';
};

const CLOUDINARY_HOST = 'res.cloudinary.com';

export function isCloudinaryUrl(url: string): boolean {
  const value = String(url || '').trim();
  return value.includes(CLOUDINARY_HOST) && value.includes('/image/upload/');
}

export function cloudinaryTransformUrl(
  url: string,
  options: TransformOptions = {},
): string {
  if (!isCloudinaryUrl(url)) {
    return url;
  }

  const parts: string[] = [];

  if (options.format) {
    parts.push(`f_${options.format}`);
  }

  if (options.quality !== undefined) {
    parts.push(`q_${options.quality}`);
  }

  if (options.width) {
    parts.push(`w_${options.width}`);
  }

  if (options.height) {
    parts.push(`h_${options.height}`);
  }

  if (options.crop) {
    parts.push(`c_${options.crop}`);
  }

  if (parts.length === 0) {
    return url;
  }

  return url.replace('/image/upload/', `/image/upload/${parts.join(',')}/`);
}
