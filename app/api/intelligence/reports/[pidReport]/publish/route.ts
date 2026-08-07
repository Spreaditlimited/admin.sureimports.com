import { NextResponse } from "next/server";

import { requireAdmin, unauthorized } from "@/app/api/invoicing/_lib/invoicing";
import { validateReportQuality } from "@/lib/intelligence/reportQuality";
import { getReportPricing } from "@/lib/intelligence/reportPricing";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ pidReport: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { pidReport } = await context.params;
  const body = await request.json().catch(() => ({}));
  const versionId = String(body.versionId || "").trim();
  const [report, version] = await Promise.all([
    prisma.intelligence_report_products.findUnique({ where: { pidReport } }),
    prisma.intelligence_report_versions.findFirst({
      where: {
        pidVersion: versionId,
        reportId: pidReport,
        pdfUrl: { not: null },
      },
    }),
  ]);
  if (!report || !version)
    return NextResponse.json(
      { success: false, error: "Generate a valid edition before publishing." },
      { status: 400 },
    );

  try {
    const expectedPricing = await getReportPricing();
    validateReportQuality(report, version.supplierSnapshot as any, {
      enforcePrice: true,
      expectedPricing,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "This edition did not pass the publication quality gate.",
      },
      { status: 400 },
    );
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.intelligence_report_versions.updateMany({
      where: { reportId: pidReport, status: "published" },
      data: { status: "superseded", updatedAt: now },
    }),
    prisma.intelligence_report_versions.update({
      where: { pidVersion: version.pidVersion },
      data: {
        status: "published",
        approvedAt: now,
        publishedAt: now,
        updatedAt: now,
      },
    }),
    prisma.intelligence_report_products.update({
      where: { pidReport },
      data: {
        status: "published",
        currentVersionId: version.pidVersion,
        supplierCount: version.supplierCount,
        publishedAt: now,
        updatedAt: now,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
