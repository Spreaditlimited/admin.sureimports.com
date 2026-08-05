import seededSuppliers from "@/docs/products/china-supplier-directory-v1/SUPPLIERS.json";
import { prisma } from "@/lib/prisma";

export type ReportSupplier = {
  supplierName: string;
  productFit: string;
  productsMade: string[];
  officialWebsite: string;
  officialContactPage: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  countryRegion: string;
  verifiedFrom: string;
  buyerNotes: string;
  verificationStatus: string;
  lastVerifiedAt: string | null;
};

export type ReportCategorySnapshot = {
  nicheId: string;
  name: string;
  slug: string;
  summary: string;
  generatedAt: string;
  suppliers: ReportSupplier[];
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function products(value: unknown, fallback: string) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(clean).filter(Boolean);
    } catch {
      return value
        .split(/[,;\n]/)
        .map(clean)
        .filter(Boolean);
    }
  }
  return fallback
    .split(/,|\band\b|\bincluding\b/i)
    .map(clean)
    .filter(Boolean)
    .slice(0, 12);
}

function globalBuyerNotes(value: unknown) {
  return clean(value)
    .replace(/Nigerian importers/gi, "importers")
    .replace(/Nigerian buyers/gi, "buyers")
    .replace(/Nigerian businesses/gi, "businesses")
    .replace(/Nigerian ([a-z-]+ )?importers/gi, "$1importers")
    .replace(/\bNigerian\b/gi, "destination-market")
    .replace(/\bNigeria\b/gi, "the destination market");
}

export async function getReportCategorySnapshot(
  nicheId: string,
): Promise<ReportCategorySnapshot> {
  const nicheRows = nicheId.startsWith("SEEDED-")
    ? []
    : await prisma.$queryRaw<
        Array<{ name: string; slug: string; summary: string | null }>
      >`
        SELECT name, slug, summary
        FROM intelligence_niches
        WHERE pidNiche = ${nicheId}
        LIMIT 1
      `;
  const niche = nicheRows[0] || null;
  const targetSlug = niche?.slug || nicheId.replace(/^SEEDED-/, "");
  const targetName =
    niche?.name ||
    clean(
      (seededSuppliers as any[]).find(
        (item) => slugify(item.niche) === targetSlug,
      )?.niche,
    );

  if (!targetName) throw new Error("Supplier category was not found.");

  const rows = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT
      s.supplierName, s.productFit, s.productsMade, s.officialWebsite,
      s.officialContactPage, s.email, s.phone, s.whatsapp, s.address,
      s.countryRegion, s.verifiedFrom, s.buyerNotes, s.verificationStatus,
      s.lastVerifiedAt
    FROM intelligence_suppliers s
    LEFT JOIN intelligence_supplier_categories sc ON sc.supplierId = s.pidSupplier
    LEFT JOIN intelligence_niches primaryNiche ON primaryNiche.pidNiche = s.nicheId
    LEFT JOIN intelligence_niches linkedNiche ON linkedNiche.pidNiche = sc.nicheId
    WHERE s.status = 'published'
      AND s.verificationStatus = 'official_site_contact_confirmed'
      AND (primaryNiche.slug = ${targetSlug} OR linkedNiche.slug = ${targetSlug})
    ORDER BY s.supplierName ASC
  `;

  // Historical seeded records predate the current attributable-WhatsApp and
  // dated-verification requirements, so paid editions use current database
  // research only.
  const seedRows: any[] = [];
  const seen = new Set<string>();
  const suppliers = [...rows, ...seedRows]
    .filter(
      (item) =>
        clean(item.whatsapp).replace(/\D/g, "").length >= 8 &&
        Boolean(item.lastVerifiedAt),
    )
    .filter((item) => {
      const key =
        `${clean(item.supplierName)}|${clean(item.officialWebsite)}`.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item): ReportSupplier => ({
      supplierName: clean(item.supplierName),
      productFit: globalBuyerNotes(item.productFit),
      productsMade: products(item.productsMade, clean(item.productFit)).map(
        globalBuyerNotes,
      ),
      officialWebsite: clean(item.officialWebsite),
      officialContactPage: clean(item.officialContactPage),
      email: clean(item.email),
      phone: clean(item.phone),
      whatsapp: clean(item.whatsapp),
      address: clean(item.address),
      countryRegion: clean(item.countryRegion),
      verifiedFrom: clean(item.verifiedFrom),
      buyerNotes: globalBuyerNotes(item.buyerNotes),
      verificationStatus: clean(item.verificationStatus),
      lastVerifiedAt: item.lastVerifiedAt
        ? new Date(item.lastVerifiedAt).toISOString()
        : null,
    }));

  if (!suppliers.length)
    throw new Error("This category has no approved suppliers to publish.");

  return {
    nicheId,
    name: targetName,
    slug: targetSlug,
    summary: clean(niche?.summary),
    generatedAt: new Date().toISOString(),
    suppliers,
  };
}
