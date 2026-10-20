import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { conversationId, requestKey, SupportError, trustedSupportMutation } from './policy';
import type { SupportActor } from './policy';
import { supportStore } from './store';
import { attachmentLimit, inspectAttachment, retentionDays } from './attachment-policy';
import { attachmentStorage } from './attachment-storage';
const headers = {'Cache-Control':'private, no-store', Vary:'Cookie', 'X-Content-Type-Options':'nosniff'};
export function attachmentEndpoints(db: PrismaClient, resolve: (edit:boolean)=>Promise<{actor:SupportActor}|null>, storage=attachmentStorage) {
  const store = supportStore(db);
  return async (request:Request, id:string, messageId?:string) => {
    try {
      if (process.env.SUPPORT_CHAT_ENABLED !== 'true') throw new SupportError(404,'Support is unavailable.');
      const edit = request.method === 'POST';
      if (edit && !trustedSupportMutation(request)) throw new SupportError(403,'Use the support inbox.');
      const identity = await resolve(edit);
      if (!identity) throw new SupportError(403,'Support access is required.');
      conversationId.parse(id);
      if (!edit) {
        if (!messageId || !/^\d{1,10}$/.test(messageId)) throw new SupportError(404,'File not found.');
        const file = await store.attachment(identity.actor,id,Number(messageId));
        if (!file.attachmentAsset) throw new SupportError(410,'This attachment has expired.');
        const [live] = await db.$queryRaw<Array<{asset:string}>>`SELECT asset FROM support_files WHERE asset=${file.attachmentAsset} AND expiresAt>NOW(3)`;
        if (!live) throw new SupportError(410,'This attachment has expired.');
        return new Response(await storage.download(file.attachmentAsset), {headers:{...headers,'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${file.attachmentName}"`, 'Content-Security-Policy':"sandbox; default-src 'none'"}});
      }
      const key = requestKey.parse(request.headers.get('x-request-key'));
      const internal = request.headers.get('x-internal-note') === 'true';
      await store.prepareAttachment(identity.actor,id,internal);
      const reader = request.body?.getReader();
      if (!reader) throw new SupportError(400,'Choose a file.');
      const chunks:Uint8Array[]=[];let size=0;
      try { while(true) { const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>attachmentLimit){await reader.cancel();throw new SupportError(413,'Choose a file smaller than 3 MB.');}chunks.push(value); } } finally {reader.releaseLock();}
      const bytes=Buffer.concat(chunks);
      const file=inspectAttachment(bytes,decodeURIComponent(request.headers.get('x-file-name') || 'Attachment'));
      const asset=`sureimports/support/${randomBytes(24).toString('hex')}`;
      // Reserve before uploading: even interrupted requests are swept within a day.
      await db.$executeRaw`INSERT INTO support_files (asset,expiresAt) VALUES (${asset},DATE_ADD(NOW(3),INTERVAL 1 DAY))`;
      await storage.upload(asset,bytes);
      const inserted=await store.send(identity.actor,id,{requestKey:key,body:file.name,internal,attachment:{...file,asset,hash:createHash('sha256').update(bytes).digest('hex'),retentionDays:retentionDays()}});
      if (!inserted) { await storage.remove(asset); await db.$executeRaw`DELETE FROM support_files WHERE asset=${asset}`; }
      return Response.json({ok:true},{headers});
    } catch(error) {
      const status=error instanceof SupportError?error.status:(error as {name?:string}).name==='ZodError' || error instanceof URIError?400:503;
      return Response.json({error:error instanceof SupportError?error.message:status===400?'Invalid file request.':'Unable to send or open this file. Please retry.'},{status,headers});
    }
  };
}
export async function cleanupAttachments(db:PrismaClient, storage=attachmentStorage) {
  const files=await db.$queryRaw<Array<{asset:string}>>`SELECT asset FROM support_files WHERE expiresAt<=NOW(3) ORDER BY expiresAt LIMIT 50`;
  let deleted=0,failed=0;
  for(const {asset} of files) {
    try {
      await storage.remove(asset);
      await db.$transaction(async tx=>{
        await tx.$executeRaw`UPDATE support_messages SET attachmentAsset=NULL WHERE attachmentAsset=${asset}`;
        await tx.$executeRaw`DELETE FROM support_files WHERE asset=${asset}`;
      });
      deleted++;
    }catch{failed++;}
  }
  return {deleted,failed};
}
