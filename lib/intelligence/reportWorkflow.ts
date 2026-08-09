import { uploadBufferToCloudinary } from "@/lib/cloudinary/upload";
import { prisma } from "@/lib/prisma";

import { ensureReportCover, resolveReportCoverAsset } from "./reportCover";
import { getReportCategorySnapshot } from "./reportData";
import { renderSupplierIntelligencePdf } from "./reportPdf";
import { getReportPricing } from "./reportPricing";
import { validateReportQuality } from "./reportQuality";
import { generateReportSeoProfile } from "./reportSeoGenerator";

function clean(value: unknown, max = 1000) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function id(prefix: string) {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

export type CreateReportInput = {
  nicheId: string;
  categoryName: string;
  editionLabel: string;
  createdByPidUser: string;
};

export type ReportAutomationStep =
  | "draft"
  | "suppliers"
  | "seo"
  | "cover"
  | "pdf"
  | "upload"
  | "quality"
  | "approval"
  | "publish";

export type ReportAutomationProgress = {
  step: ReportAutomationStep;
  status: "active" | "completed";
  detail: string;
};

type ProgressReporter = (
  progress: ReportAutomationProgress,
) => void | Promise<void>;

async function reportProgress(
  onProgress: ProgressReporter | undefined,
  step: ReportAutomationStep,
  status: ReportAutomationProgress["status"],
  detail: string,
) {
  await onProgress?.({ step, status, detail });
}

export async function createOrResumeReportDraft(input: CreateReportInput) {
  const nicheId = clean(input.nicheId, 80);
  const categoryName = clean(input.categoryName, 180);
  const editionLabel = clean(input.editionLabel, 120);
  const slug = slugify(categoryName);
  if (!nicheId || !categoryName || !editionLabel || !slug) {
    throw new Error("Category and edition label are required.");
  }

  const existing = await prisma.intelligence_report_products.findFirst({
    where: { OR: [{ nicheId }, { slug }] },
  });
  if (existing) {
    if (existing.status === "published") {
      throw new Error("This category already has a published report.");
    }
    return existing;
  }

  const [snapshot, pricing] = await Promise.all([
    getReportCategorySnapshot(nicheId),
    getReportPricing(),
  ]);
  validateReportQuality(
    {
      slug,
      coverImageUrl: null,
      priceNaira: pricing.priceNaira,
      priceUsdCents: pricing.priceUsdCents,
    },
    snapshot,
    { enforcePrice: true, expectedPricing: pricing, skipCoverCheck: true },
  );

  return prisma.intelligence_report_products.create({
    data: {
      pidReport: id("SIR"),
      nicheId,
      slug,
      title: `${categoryName} Supplier Intelligence Report`,
      subtitle: `A professionally curated shortlist of direct ${categoryName.toLowerCase()} manufacturers, built from real sourcing intelligence.`,
      description: `Move from product idea to supplier conversations with greater confidence. Review direct manufacturers, product specialisations, official contact routes and practical sourcing notes from the same research process Sure Imports uses for customer orders.`,
      editionLabel,
      coverImageUrl: null,
      priceNaira: pricing.priceNaira,
      priceUsdCents: pricing.priceUsdCents,
      status: "draft",
      automationStatus: "idle",
      supplierCount: snapshot.suppliers.length,
      createdByPidUser: input.createdByPidUser,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function generateReportEdition(
  pidReport: string,
  generatedByPidUser: string,
  onProgress?: ProgressReporter,
) {
  let report = await prisma.intelligence_report_products.findUnique({
    where: { pidReport },
  });
  if (!report) throw new Error("Report was not found.");

  const [snapshot, expectedPricing] = await Promise.all([
    getReportCategorySnapshot(report.nicheId),
    getReportPricing(),
  ]);
  validateReportQuality(report, snapshot, {
    enforcePrice: true,
    expectedPricing,
    skipCoverCheck: true,
  });
  await reportProgress(
    onProgress,
    "suppliers",
    "completed",
    `${snapshot.suppliers.length} approved manufacturers passed the report preflight`,
  );

  await reportProgress(
    onProgress,
    "cover",
    "active",
    "Preparing the category-specific cover",
  );
  const cover = await ensureReportCover(report, snapshot, async (detail) => {
    await reportProgress(onProgress, "cover", "active", detail);
  });
  if (
    report.coverImageUrl !== cover.url ||
    report.coverImagePublicId !== cover.publicId ||
    report.coverImageBytes !== cover.bytes
  ) {
    report = await prisma.intelligence_report_products.update({
      where: { pidReport },
      data: {
        coverImageUrl: cover.url,
        coverImagePublicId: cover.publicId,
        coverImageBytes: cover.bytes,
        updatedAt: new Date(),
      },
    });
  }

  validateReportQuality(report, snapshot, {
    enforcePrice: true,
    expectedPricing,
    coverImageBytes: cover.buffer.length,
  });
  await reportProgress(
    onProgress,
    "cover",
    "completed",
    cover.generated
      ? "The generated cover passed visual review and was stored"
      : "The approved category cover passed preflight",
  );

  const latest = await prisma.intelligence_report_versions.findFirst({
    where: { reportId: report.pidReport },
    orderBy: { versionNumber: "desc" },
  });
  const versionNumber = (latest?.versionNumber || 0) + 1;
  const pidVersion = id("SIV");
  await reportProgress(
    onProgress,
    "pdf",
    "active",
    `Rendering edition ${versionNumber} with supplier profiles and buyer guidance`,
  );
  const pdf = await renderSupplierIntelligencePdf(report, snapshot, {
    coverImage: cover.buffer,
  });
  await reportProgress(
    onProgress,
    "pdf",
    "completed",
    `Edition ${versionNumber} rendered successfully`,
  );
  await reportProgress(
    onProgress,
    "upload",
    "active",
    "Uploading the finished PDF to secure document storage",
  );
  const upload = await uploadBufferToCloudinary(pdf, {
    folder: "sureimports/supplier-intelligence/reports",
    publicId: `${report.slug}-${pidVersion.toLowerCase()}.pdf`,
    resourceType: "raw",
    overwrite: false,
    useFilename: true,
    uniqueFilename: false,
    tags: ["supplier-intelligence", report.slug, report.editionLabel],
  });
  await reportProgress(
    onProgress,
    "upload",
    "completed",
    "The finished PDF was uploaded successfully",
  );

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
      generatedByPidUser,
      generatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.intelligence_report_products.update({
    where: { pidReport: report.pidReport },
    data: { supplierCount: snapshot.suppliers.length, updatedAt: new Date() },
  });
  return version;
}

export async function publishReportEdition(
  pidReport: string,
  pidVersion: string,
  onProgress?: ProgressReporter,
) {
  const { report, version } = await validateReportEditionForPublication(
    pidReport,
    pidVersion,
    onProgress,
  );

  const now = new Date();
  await reportProgress(
    onProgress,
    "publish",
    "active",
    "Publishing the report and making its product page available",
  );
  await prisma.$transaction([
    prisma.intelligence_report_versions.updateMany({
      where: {
        reportId: pidReport,
        status: "published",
        pidVersion: { not: version.pidVersion },
      },
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
        automationStatus: "completed",
        automationError: null,
        automationCompletedAt: now,
        publishedAt: now,
        updatedAt: now,
      },
    }),
  ]);
  await reportProgress(
    onProgress,
    "publish",
    "completed",
    "Report and product page published successfully",
  );

  return prisma.intelligence_report_products.findUnique({
    where: { pidReport },
  });
}

async function validateReportEditionForPublication(
  pidReport: string,
  pidVersion: string,
  onProgress?: ProgressReporter,
) {
  await reportProgress(
    onProgress,
    "quality",
    "active",
    "Running the final report, price, cover and supplier quality gate",
  );
  const [report, version, expectedPricing] = await Promise.all([
    prisma.intelligence_report_products.findUnique({ where: { pidReport } }),
    prisma.intelligence_report_versions.findFirst({
      where: { pidVersion, reportId: pidReport, pdfUrl: { not: null } },
    }),
    getReportPricing(),
  ]);
  if (!report || !version) {
    throw new Error("Generate a valid edition before publishing.");
  }

  const cover = await resolveReportCoverAsset(report);
  if (!cover) throw new Error("The category-specific report cover is missing.");
  validateReportQuality(report, version.supplierSnapshot as any, {
    enforcePrice: true,
    expectedPricing,
    coverImageBytes: cover.buffer.length,
  });
  await reportProgress(
    onProgress,
    "quality",
    "completed",
    "All publication quality gates passed",
  );
  return { report, version };
}

export async function automateReportPublication(
  input: CreateReportInput,
  onProgress?: ProgressReporter,
) {
  await reportProgress(
    onProgress,
    "draft",
    "active",
    "Validating the category and preparing the report record",
  );
  const report = await createOrResumeReportDraft(input);
  await reportProgress(
    onProgress,
    "draft",
    "completed",
    "Report record is ready",
  );
  const staleBefore = new Date(Date.now() - 20 * 60 * 1000);
  const claimed = await prisma.intelligence_report_products.updateMany({
    where: {
      pidReport: report.pidReport,
      OR: [
        { automationStatus: { not: "running" } },
        { automationStartedAt: { lt: staleBefore } },
      ],
    },
    data: {
      automationStatus: "running",
      automationError: null,
      automationStartedAt: new Date(),
      automationCompletedAt: null,
      updatedAt: new Date(),
    },
  });
  if (claimed.count === 0) {
    throw new Error("This report is already being generated.");
  }

  try {
    await reportProgress(
      onProgress,
      "suppliers",
      "active",
      "Loading the approved manufacturers and checking report eligibility",
    );
    const snapshot = await getReportCategorySnapshot(report.nicheId);
    await reportProgress(
      onProgress,
      "seo",
      "active",
      "Researching buyer search language and writing the product page",
    );
    const [seoProfile, version] = await Promise.all([
      generateReportSeoProfile(snapshot).then(async (profile) => {
        await reportProgress(
          onProgress,
          "seo",
          "completed",
          `SEO profile completed around “${profile.primaryKeyword}”`,
        );
        return profile;
      }),
      generateReportEdition(
        report.pidReport,
        input.createdByPidUser,
        onProgress,
      ),
    ]);

    await prisma.intelligence_report_products.update({
      where: { pidReport: report.pidReport },
      data: {
        seoProfile: seoProfile as any,
        description: seoProfile.metaDescription,
        updatedAt: new Date(),
      },
    });
    const qualityChecked = await validateReportEditionForPublication(
      report.pidReport,
      version.pidVersion,
      onProgress,
    );
    await reportProgress(
      onProgress,
      "approval",
      "completed",
      "Ready for your preview and explicit publishing approval",
    );
    const completedAt = new Date();
    await prisma.intelligence_report_products.update({
      where: { pidReport: report.pidReport },
      data: {
        automationStatus: "awaiting_approval",
        automationError: null,
        automationCompletedAt: completedAt,
        updatedAt: completedAt,
      },
    });
    return { report: qualityChecked.report, version, seoProfile };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Report automation failed.";
    await prisma.intelligence_report_products.update({
      where: { pidReport: report.pidReport },
      data: {
        automationStatus: "failed",
        automationError: message.slice(0, 5000),
        automationCompletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    throw error;
  }
}
