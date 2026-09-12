import {
  requirePartnerReviewer,
  reviewCase,
  decideReview,
  reviewResponse,
  reviewError,
  ReviewError,
} from "@/lib/partners/review";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const admin = await requirePartnerReviewer();
    if (!admin) return reviewResponse({ message: "Not authorized." }, 403);
    return reviewResponse(
      await reviewCase((await context.params).id, admin.pidUser),
    );
  } catch (error) {
    return reviewError(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new ReviewError("Invalid request origin.", 403);
    const admin = await requirePartnerReviewer();
    if (!admin) return reviewResponse({ message: "Not authorized." }, 403);
    const reader = request.body?.getReader();
    if (!reader) throw new ReviewError("A review is required.");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16384) {
        await reader.cancel();
        throw new ReviewError("Review is too large.", 413);
      }
      chunks.push(value);
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new ReviewError("Invalid JSON.");
    }
    await decideReview((await context.params).id, admin.pidUser, body);
    return reviewResponse({
      message:
        "Review recorded. Business activation and payments remain disabled.",
    });
  } catch (error) {
    return reviewError(error);
  }
}
