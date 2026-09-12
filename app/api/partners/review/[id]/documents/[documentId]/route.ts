import {
  requirePartnerReviewer,
  downloadReviewDocument,
  reviewResponse,
  reviewError,
} from "@/lib/partners/review";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  try {
    const admin = await requirePartnerReviewer();
    if (!admin) return reviewResponse({ message: "Not authorized." }, 403);
    const { id, documentId } = await params;
    return await downloadReviewDocument(id, documentId, admin.pidUser);
  } catch (error) {
    return reviewError(error);
  }
}
