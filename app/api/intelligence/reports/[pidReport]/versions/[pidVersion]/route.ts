import { NextResponse } from "next/server";

import { requireAdmin, unauthorized } from "@/app/api/invoicing/_lib/invoicing";
import { destroyCloudinaryAsset } from "@/lib/cloudinary/destroy";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ pidReport: string; pidVersion: string }>;
  },
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { pidReport, pidVersion } = await context.params;
  const [report, version] = await Promise.all([
    prisma.intelligence_report_products.findUnique({ where: { pidReport } }),
    prisma.intelligence_report_versions.findFirst({
      where: { pidVersion, reportId: pidReport },
    }),
  ]);
  if (!report || !version) {
    return NextResponse.json(
      { success: false, error: "Report edition was not found." },
      { status: 404 },
    );
  }
  if (version.status === "published" || report.currentVersionId === pidVersion) {
    return NextResponse.json(
      { success: false, error: "The currently published edition cannot be deleted." },
      { status: 409 },
    );
  }
  const orderCount = await prisma.intelligence_report_orders.count({
    where: { versionId: pidVersion },
  });
  if (orderCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "This edition has checkout or purchase records and cannot be deleted.",
      },
      { status: 409 },
    );
  }

  if (version.pdfPublicId) {
    const result = await destroyCloudinaryAsset(version.pdfPublicId, {
      resourceType: "raw",
      invalidate: true,
    });
    const storageResult = String(result?.result || "");
    if (!["ok", "not found", "not_found"].includes(storageResult)) {
      return NextResponse.json(
        { success: false, error: "Unable to remove this PDF from storage." },
        { status: 502 },
      );
    }
  }

  await prisma.intelligence_report_versions.delete({ where: { pidVersion } });
  const latest = await prisma.intelligence_report_versions.findFirst({
    where: { reportId: pidReport },
    orderBy: { versionNumber: "desc" },
  });
  await prisma.intelligence_report_products.update({
    where: { pidReport },
    data: {
      supplierCount: latest?.supplierCount || 0,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
