import { activatePartner } from '@/lib/partners/activation';
import { schedulePartnerNotification } from '@/lib/partners/notifications';
import { requirePartnerReviewer, ReviewError, reviewError, reviewResponse } from '@/lib/partners/review';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new ReviewError('Invalid request origin.', 403);
    const admin = await requirePartnerReviewer();
    if (!admin) return reviewResponse({ message: 'Not authorized.' }, 403);
    const reader = request.body?.getReader();
    if (!reader) throw new ReviewError('Activation details are required.');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 4096) { await reader.cancel(); throw new ReviewError('Request too large.', 413); } chunks.push(value); }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ReviewError('Invalid JSON.'); }
    const notificationId = await activatePartner((await context.params).id, admin.pidUser, body);
    schedulePartnerNotification(notificationId);
    return reviewResponse({ message: 'Verification complete. Business and payment collection activated. Checkout requires a verified payout destination and a published storefront.' });
  } catch (error) { return reviewError(error); }
}
