import { readCommercialTerms, saveCommercialTerms } from '@/lib/partners/commercial-terms';
import { requirePartnerReviewer, ReviewError, reviewError, reviewResponse } from '@/lib/partners/review';
import { schedulePartnerNotification } from '@/lib/partners/notifications';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    if (!await requirePartnerReviewer()) throw new ReviewError('Not authorized.', 403);
    return reviewResponse(await readCommercialTerms((await context.params).id));
  } catch (error) { return reviewError(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new ReviewError('Invalid request origin.', 403);
    const actor = await requirePartnerReviewer();
    if (!actor) throw new ReviewError('Not authorized.', 403);
    if (!request.headers.get('content-type')?.includes('application/json')) throw new ReviewError('JSON required.', 415);
    const reader = request.body?.getReader();
    if (!reader) throw new ReviewError('Commercial terms are required.', 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 8192) { await reader.cancel(); throw new ReviewError('Request too large.', 413); } chunks.push(value); }
    let input: unknown;
    try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ReviewError('Invalid JSON.', 400); }
    const result = await saveCommercialTerms((await context.params).id, actor.pidUser, input);
    if (result.notificationId) schedulePartnerNotification(result.notificationId);
    return reviewResponse({ message: result.changed ? 'Commercial terms saved. The partner must accept the revised agreement before new checkouts are enabled. Existing orders retain their recorded pricing.' : 'No changes to save.' });
  } catch (error) { return reviewError(error); }
}
