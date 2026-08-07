import { NextResponse } from "next/server";

import { requireAdmin, unauthorized } from "@/app/api/invoicing/_lib/invoicing";
import { getReportCategorySnapshot } from "@/lib/intelligence/reportData";
import { renderSupplierIntelligencePdf } from "@/lib/intelligence/reportPdf";
import { getReportPricing } from "@/lib/intelligence/reportPricing";
import { validateReportQuality } from "@/lib/intelligence/reportQuality";
import { uploadBufferToCloudinary } from "@/lib/cloudinary/upload";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function id(prefix: string) {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ pidReport: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { pidReport } = await context.params;
  const report = await prisma.intelligence_report_products.findUnique({
    where: { pidReport },
  });
  if (!report)
    return NextResponse.json(
      { success: false, error: "Report was not found." },
      { status: 404 },
    );

  try {
    const [snapshot, expectedPricing] = await Promise.all([
      getReportCategorySnapshot(report.nicheId),
      getReportPricing(),
    ]);
    validateReportQuality(report, snapshot, {
      enforcePrice: true,
      expectedPricing,
    });
    const latest = await prisma.intelligence_report_versions.findFirst({
      where: { reportId: report.pidReport },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (latest?.versionNumber || 0) + 1;
    const pidVersion = id("SIV");
    const pdf = await renderSupplierIntelligencePdf(report, snapshot);
    const upload = await uploadBufferToCloudinary(pdf, {
      folder: "sureimports/supplier-intelligence/reports",
      publicId: `${report.slug}-${pidVersion.toLowerCase()}.pdf`,
      resourceType: "raw",
      overwrite: false,
      useFilename: true,
      uniqueFilename: false,
      tags: ["supplier-intelligence", report.slug, report.editionLabel],
    });

    const version = await prisma.intelligence_report_versions.create({
      data: {
        pidVersion,
        reportId: report.pidReport,
        versionNumber,
        editionLabel: report.editionLabel,
        supplierSnapshot: snapshot as any,
        supplierCount: snapshot.suppliers.length,
        pdfUrl: upload.url,
        pdfPublicId: upload.publicId,
        fileBytes: pdf.length,
        status: "generated",
        generatedByPidUser: admin.pidUser,
        generatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await prisma.intelligence_report_products.update({
      where: { pidReport: report.pidReport },
      data: { supplierCount: snapshot.suppliers.length, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: version });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "PDF generation failed." },
      { status: 500 },
    );
  }
}
