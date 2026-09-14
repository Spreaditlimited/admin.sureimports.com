import { adminAgreement } from './agreement';
import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/invoicing/_lib/invoicing";
import { isSuperAdminStatus } from "@/lib/accessControl";
import { getCloudinary } from "@/lib/cloudinary/config";
import { decryptKyc, encryptKyc } from "./kyc-crypto";
import { reviewSchema, reviewTarget } from "./review-policy";

export class ReviewError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function requirePartnerReviewer() {
  const admin = await requireAdmin();
  return admin && isSuperAdminStatus(admin.userStatus) ? admin : null;
}
export function reviewResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
export function reviewError(error: unknown) {
  return reviewResponse(
    {
      message:
        error instanceof ReviewError
          ? error.message
          : "Partner review is unavailable. Please try again.",
    },
    error instanceof ReviewError ? error.status : 503,
  );
}
export type QueueItem = {
  id: string;
  legalName: string;
  registrationNumber: string;
  businessStatus: string;
  status: string;
  revision: number;
  submittedAt: Date | null;
};
export async function reviewQueue(page = 1) {
  const offset = (page - 1) * 25;
  const rows = await prisma.$queryRaw<
    (QueueItem & { reviewCiphertext: string | null })[]
  >`SELECT p.id, p.legalName, p.registrationNumber, p.status AS businessStatus, k.status, k.revision, k.submittedAt, k.reviewCiphertext FROM procurement_partners p INNER JOIN procurement_partner_kyc k ON k.partnerId = p.id WHERE k.status IN ('SUBMITTED', 'VERIFIED', 'REJECTED') OR (k.status = 'DRAFT' AND k.submittedAt IS NOT NULL) ORDER BY (p.status = 'PENDING' AND k.status = 'SUBMITTED') DESC, k.submittedAt DESC, p.id LIMIT 25 OFFSET ${offset}`;
  return Promise.all(rows.map(async ({ reviewCiphertext, ...row }) => {
    const review = reviewCiphertext ? JSON.parse(decryptKyc(Buffer.from(reviewCiphertext, 'base64'), row.id).toString('utf8')) : {};
    return { ...row, agreementStatus: (await adminAgreement(row.id)).status, businessFitDecision: typeof review.businessFit?.decision === 'string' ? review.businessFit.decision : null };
  }));
}
type CaseRow = QueueItem & {
  detailsCiphertext: string | null;
  reviewCiphertext: string | null;
};
export async function reviewCase(id: string, actorPid: string) {
  const rows = await prisma.$queryRaw<
    CaseRow[]
  >`SELECT p.id, p.legalName, p.registrationNumber, p.status AS businessStatus, k.status, k.revision, k.submittedAt, k.detailsCiphertext, k.reviewCiphertext FROM procurement_partners p INNER JOIN procurement_partner_kyc k ON k.partnerId = p.id WHERE p.id = ${id} LIMIT 1`;
  const row = rows[0];
  if (!row) throw new ReviewError("Application not found.", 404);
  const documents = await prisma.$queryRaw<
    Array<{ id: string; slot: string; mimeType: string; bytes: number }>
  >`SELECT id, slot, mimeType, bytes FROM procurement_partner_kyc_documents WHERE partnerId = ${id} AND status = 'READY' ORDER BY slot`;
  await prisma.$executeRaw`INSERT INTO procurement_partner_kyc_events (id, partnerId, actorPid, action, createdAt) VALUES (${randomUUID()}, ${id}, ${actorPid}, 'ADMIN_CASE_VIEWED', NOW(3))`;
  const decode = (value: string | null) =>
    value
      ? JSON.parse(
          decryptKyc(Buffer.from(value, "base64"), id).toString("utf8"),
        )
      : null;
  const { detailsCiphertext, reviewCiphertext, ...safe } = row;
  const agreement = await adminAgreement(id);
  const notifications = await prisma.$queryRaw<Array<{ action: string; emailStatus: string; emailAttempts: number; emailSentAt: Date | null; emailFailureCode: string | null; createdAt: Date }>>`SELECT action, emailStatus, emailAttempts, emailSentAt, emailFailureCode, createdAt FROM procurement_partner_kyc_events WHERE partnerId=${id} AND emailStatus <> 'NONE' ORDER BY createdAt DESC LIMIT 5`;
  return {
    ...safe,
    details: decode(detailsCiphertext),
    review: decode(reviewCiphertext),
    documents,
    notifications,
    agreement,
  };
}
export async function decideReview(
  id: string,
  actorPid: string,
  input: unknown,
) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success)
    throw new ReviewError(
      parsed.error.issues.map((i) => i.message).join(" "),
      422,
    );
  const body = parsed.data;
  const notificationId = randomUUID();
  const note = { ...body, actorPid, reviewedAt: new Date().toISOString() };
  const encrypted = encryptKyc(Buffer.from(JSON.stringify(note)), id).toString(
    "base64",
  );
  await prisma.$transaction(async (tx) => {
    const policies=await tx.$queryRaw<Array<{policyJson:string}>>`SELECT policyJson FROM partner_application_country_policy WHERE partnerId=${id}`;
    if(body.decision==='VERIFIED' && !policies[0])throw new ReviewError('Country verification policy is missing. Resolve the policy before approving.',409);
    if(body.decision==='VERIFIED' && policies[0]) {
      const policy=JSON.parse(policies[0].policyJson);
      if(policy.verificationProfile==='UK_STANDARD' && (!body.checkedAddressEvidence || (policy.requireIdentityMeeting && !body.checkedIdentityMeeting) || (policy.requireOwnNamePayout && !body.checkedOwnNamePayout))) throw new ReviewError('Confirm current address evidence, the manual identity/video check and the own-name payout account before approving this applicant.',422);
    }
    const rows = await tx.$queryRaw<
      Array<{ status: string; revision: number; reviewCiphertext: string | null }>
    >`SELECT status, revision, reviewCiphertext FROM procurement_partner_kyc WHERE partnerId = ${id} FOR UPDATE`;
    if (!rows[0]) throw new ReviewError("Application not found.", 404);
    if (rows[0].revision !== body.revision || rows[0].status !== "SUBMITTED")
      throw new ReviewError(
        "Case changed or has already been reviewed. Reload it.",
        409,
      );
    const status = reviewTarget(rows[0].status, body.decision);
    const previous = rows[0].reviewCiphertext ? JSON.parse(decryptKyc(Buffer.from(rows[0].reviewCiphertext, 'base64'), id).toString('utf8')) : {};
    const combined = encryptKyc(Buffer.from(JSON.stringify({ ...note, businessFit: previous.businessFit, automaticFit: previous.automaticFit })), id).toString('base64');
    await tx.$executeRaw`UPDATE procurement_partner_kyc SET status = ${status}, reviewCiphertext = ${combined}, revision = revision + 1, updatedAt = NOW(3) WHERE partnerId = ${id}`;
    await tx.$executeRaw`INSERT INTO procurement_partner_kyc_events (id, partnerId, actorPid, action, detailsCiphertext, createdAt, emailStatus) VALUES (${notificationId}, ${id}, ${actorPid}, ${"ADMIN_" + body.decision}, ${encrypted}, NOW(3), 'QUEUED')`;
    // Deliberately never update partner approval, storefront publication or collection here.
  });
  return notificationId;
}
export async function downloadReviewDocument(
  id: string,
  documentId: string,
  actorPid: string,
) {
  const rows = await prisma.$queryRaw<
    Array<{
      cloudinaryId: string;
      mimeType: string;
      bytes: number;
      sha256: string;
    }>
  >`SELECT cloudinaryId, mimeType, bytes, sha256 FROM procurement_partner_kyc_documents WHERE id = ${documentId} AND partnerId = ${id} AND status = 'READY' LIMIT 1`;
  const doc = rows[0];
  if (!doc) throw new ReviewError("Document not found.", 404);
  const url = getCloudinary().utils.private_download_url(doc.cloudinaryId, "", {
    resource_type: "raw",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 60,
  });
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Protected storage unavailable.");
  const bytes = decryptKyc(Buffer.from(await response.arrayBuffer()), id);
  if (
    bytes.length !== doc.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== doc.sha256
  )
    throw new Error("Document integrity failed.");
  await prisma.$executeRaw`INSERT INTO procurement_partner_kyc_events (id, partnerId, actorPid, action, documentId, createdAt) VALUES (${randomUUID()}, ${id}, ${actorPid}, 'ADMIN_DOCUMENT_DOWNLOADED', ${documentId}, NOW(3))`;
  const extension =
    doc.mimeType === "application/pdf"
      ? "pdf"
      : doc.mimeType === "image/png"
        ? "png"
        : "jpg";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="verification-document.${extension}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
