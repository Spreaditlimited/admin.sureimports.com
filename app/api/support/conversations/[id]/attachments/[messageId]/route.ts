import { adminAttachments } from '@/lib/support/server';
export async function GET(request:Request, {params}:{params:Promise<{id:string;messageId:string}>}) {
 const {id,messageId}=await params;return adminAttachments(request,id, messageId);
}
