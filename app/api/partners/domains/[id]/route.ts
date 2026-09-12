import { randomUUID, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { requirePartnerReviewer,reviewResponse,reviewError,ReviewError } from '@/lib/partners/review';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    if(request.headers.get('origin')!==new URL(request.url).origin)throw new ReviewError('Invalid origin.',403);
    const admin=await requirePartnerReviewer();if(!admin)throw new ReviewError('Not authorized.',403);
    const reader=request.body?.getReader();if(!reader)throw new ReviewError('Request required.');let size=0;const chunks:Uint8Array[]=[];
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new ReviewError('Request too large.',413);}chunks.push(value);}
    const body=JSON.parse(Buffer.concat(chunks).toString());
    if(!['reset','suspend'].includes(body.action)||typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>250||Object.keys(body).some(k=>!['action','reason'].includes(k)))throw new ReviewError('Provide an action and an audit reason.');
    const {id}=await params;
    await prisma.$transaction(async tx=>{
      const [domain]=await tx.$queryRaw<{id:string;partnerId:string}[]>`SELECT id,partnerId FROM procurement_partner_domains WHERE id=${id} FOR UPDATE`;
      if(!domain)throw new ReviewError('Domain not found.',404);
      const status=body.action==='suspend'?'SUSPENDED':'OWNERSHIP_REQUIRED';
      const challenge=randomBytes(32).toString('hex');
      await tx.$executeRaw`UPDATE procurement_partner_domains SET status=${status},readyAt=NULL,verifiedAt=NULL,\`primary\`=0,lastCheckedAt=NULL,lastError=NULL,leaseUntil=NULL,leaseToken=NULL,verificationTokenHash=${challenge} WHERE id=${id}`;
      const message=`Admin ${admin.pidUser}: ${body.reason.trim()}`;
      await tx.$executeRaw`INSERT INTO procurement_partner_domain_events(id,domainId,partnerId,action,message,createdAt) VALUES(${randomUUID()},${id},${domain.partnerId},${`ADMIN_${body.action.toUpperCase()}`},${message},NOW(3))`;
    });
    return reviewResponse({message:'Domain control updated. No registration or DNS records were deleted.'});
  }catch(e){return reviewError(e);}
}
