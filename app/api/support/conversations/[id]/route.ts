import { adminSupport } from '@/lib/support/server';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { return adminSupport.history(request, (await context.params).id); }
export async function POST(request: Request, context: Context) { return adminSupport.send(request, (await context.params).id); }
export async function PATCH(request: Request, context: Context) { return adminSupport.status(request, (await context.params).id); }
