import { decideBusinessFit } from '@/lib/partners/business-fit';
import { requirePartnerReviewer, reviewResponse, reviewError, ReviewError } from '@/lib/partners/review';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new ReviewError('Invalid request origin.', 403);
    const admin = await requirePartnerReviewer();
    if (!admin) return reviewResponse({ message: 'Not authorized.' }, 403);
    const reader = request.body?.getReader(); if (!reader) throw new ReviewError('Assessment is required.');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 16384) { await reader.cancel(); throw new ReviewError('Assessment is too large.', 413); } chunks.push(value); }
    let input: unknown; try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ReviewError('Invalid JSON.', 422); }
    await decideBusinessFit((await context.params).id, admin.pidUser, input);
    return reviewResponse({ message: 'Business-fit decision saved. KYC, activation and payments are unchanged.' });
  } catch (error) { return reviewError(error); }
}
