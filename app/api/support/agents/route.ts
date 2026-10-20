import { adminManagement } from '@/lib/support/server';
export async function GET(request:Request){return adminManagement(request,'agents');}
