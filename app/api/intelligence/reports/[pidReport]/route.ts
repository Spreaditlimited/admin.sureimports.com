import { NextResponse } from "next/server";

import { requireAdmin, unauthorized } from "@/app/api/invoicing/_lib/invoicing";
import { destroyCloudinaryAsset } from "@/lib/cloudinary/destroy";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function storageDeletionSucceeded(result: unknown) {
  const value = String((result as { result?: string })?.result || "");
  return ["ok", "not found", "not_found"].includes(value);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ pidReport: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { pidReport } = await context.params;
  const report = await prisma.intelligence_report_products.findUnique({
    where: { pidReport },
  });
  if (!report) {
    return NextResponse.json(
      { success: false, error: "Report was not found." },
      { status: 404 },
    );
  }
  if (report.status !== "draft" || report.currentVersionId) {
    return NextResponse.json(
      { success: false, error: "Only an unpublished draft report can be deleted." },
      { status: 409 },
    );
  }

  const [versions, orderCount] = await Promise.all([
    prisma.intelligence_report_versions.findMany({
      where: { reportId: pidReport },
    }),
    prisma.intelligence_report_orders.count({ where: { reportId: pidReport } }),
  ]);
  if (orderCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "This report has checkout or purchase records and cannot be deleted.",
      },
      { status: 409 },
    );
  }
  if (versions.some((version) => version.status === "published")) {
    return NextResponse.json(
      { success: false, error: "A published edition prevents draft deletion." },
      { status: 409 },
    );
  }

  for (const version of versions) {
    if (!version.pdfPublicId) continue;
    const result = await destroyCloudinaryAsset(version.pdfPublicId, {
      resourceType: "raw",
      invalidate: true,
    });
    if (!storageDeletionSucceeded(result)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unable to remove PDF storage for Version ${version.versionNumber}.`,
        },
        { status: 502 },
      );
    }
  }

  await prisma.$transaction([
    prisma.intelligence_report_versions.deleteMany({
      where: { reportId: pidReport },
    }),
    prisma.intelligence_report_products.delete({ where: { pidReport } }),
  ]);

  return NextResponse.json({ success: true });
}
