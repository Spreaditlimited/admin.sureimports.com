import { prisma } from '@/lib/prisma';
import { countryPolicySchema, parseStoredCountryPolicy } from '@/lib/partners/country-policy';
import { requirePartnerReviewer, ReviewError, reviewError, reviewResponse } from '@/lib/partners/review';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    if (!await requirePartnerReviewer()) throw new ReviewError('Not authorized.',403);
    const rows=await prisma.$queryRaw<Array<{policyJson:string}>>`SELECT policyJson FROM partner_country_policies ORDER BY code`;
    return reviewResponse({countries:rows.map(row=>parseStoredCountryPolicy(JSON.parse(row.policyJson)))});
  } catch(error){return reviewError(error);}
}
export async function POST(request:Request) {
  try {
    if (request.headers.get('origin')!==new URL(request.url).origin) throw new ReviewError('Invalid request origin.',403);
    const actor=await requirePartnerReviewer(); if(!actor)throw new ReviewError('Not authorized.',403);
    if(!request.headers.get('content-type')?.includes('application/json'))throw new ReviewError('JSON required.',415);
    const reader=request.body?.getReader(); if(!reader)throw new ReviewError('Country settings are required.');
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();throw new ReviewError('Settings are too large.',413);}chunks.push(value);}
    let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ReviewError('Invalid JSON.');}
    const parsed=countryPolicySchema.safeParse(input);if(!parsed.success)throw new ReviewError(parsed.error.issues.map(x=>`${x.path.join('.')}: ${x.message}`).join(' '),422);
    const policy=parsed.data;
    const result=await prisma.$transaction(async tx=>{
      const rows=await tx.$queryRaw<Array<{revision:number}>>`SELECT revision FROM partner_country_policies WHERE code=${policy.code} FOR UPDATE`;
      if((rows[0]?.revision||0)!==policy.revision)throw new ReviewError('Country settings changed. Refresh before saving.',409);
      const next={...policy,revision:policy.revision+1},json=JSON.stringify(next);
      if(rows.length)await tx.$executeRaw`UPDATE partner_country_policies SET policyJson=${json},revision=${next.revision},updatedBy=${actor.pidUser},updatedAt=NOW(3) WHERE code=${policy.code}`;
      else await tx.$executeRaw`INSERT INTO partner_country_policies (code,policyJson,revision,updatedBy) VALUES (${policy.code},${json},${next.revision},${actor.pidUser})`;
      await tx.$executeRaw`INSERT INTO partner_country_policy_history (code,revision,policyJson,actorPid) VALUES (${policy.code},${next.revision},${json},${actor.pidUser})`;
      return next;
    });
    return reviewResponse({country:result,message:'Country policy saved. Existing applications retain their verification rules; existing subscription prices do not change automatically.'});
  }catch(error){return reviewError(error);}
}
