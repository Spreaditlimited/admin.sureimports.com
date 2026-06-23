export const BLOG_IMAGE_FOLDER = 'admin-sureimports/blog';

export function normalizeBlogImagePublicId(imageName?: string | null) {
  const value = String(imageName || '').trim();
  if (!value) return '';

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const uploadPath = '/image/upload/';
      const uploadIndex = url.pathname.indexOf(uploadPath);
      if (uploadIndex === -1) return value;

      return decodeURIComponent(url.pathname.slice(uploadIndex + uploadPath.length))
        .replace(/^v\d+\//, '')
        .replace(/\.[a-z0-9]+$/i, '');
    } catch {
      return value;
    }
  }

  if (value.includes('/')) return value;
  if (value.startsWith('BLOG_')) return `${BLOG_IMAGE_FOLDER}/${value}`;

  return value;
}

export function getBlogImageUrl(imageName?: string | null, fallback: string | null = null) {
  const value = String(imageName || '').trim();
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) return value;

  const baseUrl = process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL?.replace(/\/+$/, '');
  const publicId = normalizeBlogImagePublicId(value);

  return baseUrl && publicId ? `${baseUrl}/${publicId}` : fallback;
}
