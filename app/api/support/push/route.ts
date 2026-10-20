import { cookies } from 'next/headers';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { prisma } from '@/lib/prisma';
import { pushActionSchema } from '@/lib/support/push-policy';
import { pushSubscriptions } from '@/lib/support/push-store';
import { SupportError, trustedSupportMutation } from '@/lib/support/policy';
import { ZodError } from 'zod';
const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};
const cookieName=process.env.NODE_ENV==='production'?'__Host-si-support-push':'si-support-push';
async function run(request:Request) {
 try {
  if (process.env.SUPPORT_CHAT_ENABLED!=='true') throw new SupportError(404,'Support is unavailable.');
  if (request.method!=='GET' && !trustedSupportMutation(request)) throw new SupportError(403,'Please use the support inbox.');
  const access=await requireAdminServiceAccess('customer_support','view');
  if (!access.ok) return access.response;
  const configured=process.env.SUPPORT_PUSH_ENABLED==='true' && Boolean(process.env.SUPPORT_VAPID_PUBLIC_KEY && process.env.SUPPORT_VAPID_PRIVATE_KEY);
  if (request.method==='GET') return Response.json({configured,publicKey:configured?process.env.SUPPORT_VAPID_PUBLIC_KEY:null},{headers});
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new SupportError(415,'Use JSON.');
  const reader=request.body?.getReader();if(!reader) throw new SupportError(400,'Missing request.');
  const chunks:Uint8Array[]=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw new SupportError(413,'Request too large.');}chunks.push(value);}}finally{reader.releaseLock();}
  const input=pushActionSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  const store=pushSubscriptions(prisma);
  if (input.action==='status') return Response.json({enabled:await store.status(access.admin.pidUser,input.endpoint)},{headers});
  if(input.action==='unsubscribe') {
   await store.unsubscribe(access.admin.pidUser,input.endpoint);(await cookies()).delete(cookieName);
   return Response.json({enabled:false},{headers});
  }
  if(!configured) throw new SupportError(503,'Push notifications are not available yet.');
  const id=await store.subscribe(access.admin.pidUser,input.subscription);
  (await cookies()).set(cookieName,id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:90*86400});
  return Response.json({enabled:true},{headers});
 }catch(error){
  const status=error instanceof SupportError?error.status:error instanceof ZodError || error instanceof SyntaxError?400:503;
  return Response.json({error:error instanceof SupportError?error.message:status===400?'Invalid browser subscription.':'Notifications are temporarily unavailable.'},{status,headers});
 }
}
export const GET=run;
export const POST=run;
