import { dispatchProcurementReviewEmails } from '@/lib/procurement/reviewEmail';
export const maxDuration = 120;
export async function GET(request: Request) {
 if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', {status:401});
 return Response.json(await dispatchProcurementReviewEmails());
}
