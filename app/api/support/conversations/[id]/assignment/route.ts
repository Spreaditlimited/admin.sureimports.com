import { adminManagement } from '@/lib/support/server';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){return adminManagement(request,'assign',(await params).id);}
