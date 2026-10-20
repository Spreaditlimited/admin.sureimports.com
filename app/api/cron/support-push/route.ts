import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { deliverAdminPush } from '@/lib/support/push-store';
export const maxDuration=120;
export async function GET(request:Request) {
 if(!process.env.CRON_SECRET || request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`) return Response.json({error:'Unauthorized'},{status:401});
 if(process.env.SUPPORT_CHAT_ENABLED!=='true' || process.env.SUPPORT_PUSH_ENABLED!=='true') return Response.json({disabled:true});
 const publicKey=process.env.SUPPORT_VAPID_PUBLIC_KEY,privateKey=process.env.SUPPORT_VAPID_PRIVATE_KEY;
 if(!publicKey || !privateKey) return Response.json({error:'Push credentials are not configured.'},{status:503});
 const result=await deliverAdminPush(prisma,(subscription,payload)=>webpush.sendNotification(subscription,JSON.stringify(payload),{vapidDetails:{subject:'mailto:hello@sureimports.com',publicKey,privateKey},TTL:3600,urgency:'high',timeout:4000}));
 return Response.json(result);
}
