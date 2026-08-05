import { getCloudinary } from '@/lib/cloudinary/config';

export async function downloadCloudinaryPdf(publicId: string) {
  const cloudinary = getCloudinary();
  const signedUrl = cloudinary.utils.private_download_url(publicId, '', {
    resource_type: 'raw',
    type: 'upload',
    expires_at: Math.floor(Date.now() / 1000) + 300,
    attachment: false,
  });
  const response = await fetch(signedUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to retrieve PDF from storage (${response.status}).`);
  }
  const pdf = Buffer.from(await response.arrayBuffer());
  if (pdf.length < 5 || pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('The stored report is not a valid PDF.');
  }
  return pdf;
}
