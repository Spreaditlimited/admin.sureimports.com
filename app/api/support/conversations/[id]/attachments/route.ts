import { adminAttachments } from '@/lib/support/server';
export async function POST(request:Request, {params}:{params:Promise<{id:string}>}) {
 const {id}=await params;return adminAttachments(request,id);
}
