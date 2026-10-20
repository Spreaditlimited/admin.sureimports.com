import { adminManagement } from '@/lib/support/server';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return adminManagement(request,'read',(await params).id);}
