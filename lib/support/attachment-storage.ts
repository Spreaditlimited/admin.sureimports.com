import 'server-only';
import { getCloudinary } from '@/lib/cloudinary/config';
export const attachmentStorage = {
  async upload(asset: string, bytes: Buffer) {
    await new Promise((resolve, reject) => {
      getCloudinary().uploader.upload_stream({public_id: asset, resource_type:'raw', type:'authenticated', overwrite:false}, (error, result) => error ? reject(error) : resolve(result)).end(bytes);
    });
  },
  async remove(asset: string) {
    const result = await getCloudinary().uploader.destroy(asset, {resource_type:'raw', type:'authenticated', invalidate:true});
    if (!['ok','not found'].includes(result.result)) throw new Error('File cleanup failed');
  },
  async download(asset: string) {
    const url = getCloudinary().utils.private_download_url(asset, '', {resource_type:'raw', type:'authenticated', expires_at:Math.floor(Date.now()/1000)+60});
    const response = await fetch(url, {cache:'no-store', signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('File unavailable');
    return response.body;
  },
};
