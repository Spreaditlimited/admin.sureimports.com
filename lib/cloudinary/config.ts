import { v2 as cloudinary } from 'cloudinary';

let isConfigured = false;

export function requireEnv(name: string): string {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function getCloudinary() {
  if (!isConfigured) {
    cloudinary.config({
      cloud_name: requireEnv('CLOUDINARY_CLOUD_NAME'),
      api_key: requireEnv('CLOUDINARY_API_KEY'),
      api_secret: requireEnv('CLOUDINARY_API_SECRET'),
      secure: true,
    });
    isConfigured = true;
  }

  return cloudinary;
}
