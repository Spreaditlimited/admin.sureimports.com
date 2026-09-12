import { assessBusinessFit } from '@/lib/partners/business-fit-assessment';
import { requirePartnerReviewer, reviewResponse, reviewError, ReviewError } from '@/lib/partners/review';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new ReviewError('Invalid request origin.', 403);
    const admin = await requirePartnerReviewer();
    if (!admin) return reviewResponse({ message: 'Not authorized.' }, 403);
    // Answers are loaded server-side: never score a caller-supplied replacement.
    const result = await assessBusinessFit((await context.params).id, admin.pidUser);
    return reviewResponse(result, result.status === 'RUNNING' ? 202 : 200);
  } catch (error) { return reviewError(error); }
}
