import sharp from 'sharp';
import { vehicleAdmin } from '@/lib/vehicles/access';
import { sameOrigin } from '@/lib/vehicles/http';
import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';
export async function POST(request: Request) {
  if (!await vehicleAdmin(true)) return Response.json({ message: 'Access denied' }, { status: 403 });
  try {
    sameOrigin(request);
    if (Number(request.headers.get('content-length')) > 11 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
    const data = await request.formData(); const file = data.get('image');
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024 || file.size === 0) throw new Error('Choose a JPG, PNG or WebP image smaller than 10 MB.');
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '')) throw new Error('Only JPG, PNG and WebP images are supported.');
    const buffer = await image.rotate().resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    const uploaded = await uploadBufferToCloudinary(buffer, { folder: 'sureimports/vehicles', resourceType: 'image', uniqueFilename: true });
    return Response.json({ url: uploaded.url });
  } catch (e) { return Response.json({ message: (e as Error).message }, { status: 400 }); }
}
