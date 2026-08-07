import { NextResponse } from "next/server";

import { getReportCategorySnapshot } from "@/lib/intelligence/reportData";
import { getReportPricing } from "@/lib/intelligence/reportPricing";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "../../invoicing/_lib/invoicing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function serialize(report: any) {
  return {
    ...report,
    createdAt: report.createdAt?.toISOString?.() || report.createdAt,
    updatedAt: report.updatedAt?.toISOString?.() || report.updatedAt,
    publishedAt: report.publishedAt?.toISOString?.() || report.publishedAt,
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const reports = await prisma.intelligence_report_products.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });
  const versions = await prisma.intelligence_report_versions.findMany({
    where: { reportId: { in: reports.map((report) => report.pidReport) } },
    orderBy: [{ versionNumber: "desc" }],
  });

  return NextResponse.json({
    success: true,
    data: reports.map((report) => ({
      ...serialize(report),
      versions: versions.filter(
        (version) => version.reportId === report.pidReport,
      ),
    })),
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const body = await request.json().catch(() => ({}));

  const nicheId = clean(body.nicheId, 80);
  const categoryName = clean(body.categoryName, 180);
  const title = clean(
    body.title || `${categoryName} Supplier Intelligence Report`,
    220,
  );
  const slug = slugify(clean(body.slug || categoryName, 180));
  const editionLabel = clean(
    body.editionLabel ||
      new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
      }).format(new Date()),
    120,
  );
  const { priceNaira, priceUsdCents } = await getReportPricing();

  if (!nicheId || !categoryName || !title || !slug) {
    return NextResponse.json(
      { success: false, error: "Category, title and slug are required." },
      { status: 400 },
    );
  }
  const existing = await prisma.intelligence_report_products.findFirst({
    where: { OR: [{ nicheId }, { slug }] },
  });
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: "A report already exists for this category or slug.",
      },
      { status: 409 },
    );
  }

  let supplierCount = 0;
  try {
    const snapshot = await getReportCategorySnapshot(nicheId);
    supplierCount = snapshot.suppliers.length;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "This category has no approved suppliers for a report.",
      },
      { status: 400 },
    );
  }

  const report = await prisma.intelligence_report_products.create({
    data: {
      pidReport: id("SIR"),
      nicheId,
      slug,
      title,
      subtitle:
        clean(body.subtitle, 255) ||
        `A professionally curated shortlist of direct ${categoryName.toLowerCase()} manufacturers, built from real sourcing intelligence.`,
      description:
        clean(body.description, 5000) ||
        `Move from product idea to supplier conversations with greater confidence. Review direct manufacturers, product specialisations, official contact routes and practical sourcing notes from the same research process Sure Imports uses for customer orders.`,
      editionLabel,
      coverImageUrl: clean(body.coverImageUrl, 1000) || null,
      priceNaira,
      priceUsdCents,
      status: "draft",
      supplierCount,
      createdByPidUser: admin.pidUser,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, data: serialize(report) });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const pidReport = clean(body.pidReport, 80);
  if (!pidReport)
    return NextResponse.json(
      { success: false, error: "Report ID is required." },
      { status: 400 },
    );

  const report = await prisma.intelligence_report_products.update({
    where: { pidReport },
    data: {
      title: clean(body.title, 220),
      subtitle: clean(body.subtitle, 255) || null,
      description: clean(body.description, 5000) || null,
      editionLabel: clean(body.editionLabel, 120),
      coverImageUrl: clean(body.coverImageUrl, 1000) || null,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, data: serialize(report) });
}
