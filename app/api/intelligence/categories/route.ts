import { NextRequest, NextResponse } from 'next/server';

import seededSuppliers from '@/docs/products/china-supplier-directory-v1/SUPPLIERS.json';
import { prisma } from '@/lib/prisma';
import {
  canonicalCategoryKey,
  categoriesAreCloselyRelated,
  normalizeCategoryTokens,
} from '@/lib/intelligence/categoryNormalization';
import { requireAdmin, unauthorized } from '../../invoicing/_lib/invoicing';

type SeededSupplier = (typeof seededSuppliers)[number];

function clean(value: unknown, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function randomId(prefix: string) {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseProducts(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => clean(item, 140)).filter(Boolean)
      : [];
  } catch {
    return value
      .split(/[,;\n]/)
      .map((item) => clean(item, 140))
      .filter(Boolean);
  }
}

function categoryLooksRelevant(categoryName: string, supplierText: string) {
  const tokens = normalizeCategoryTokens(categoryName).filter(
    (token) => token.length > 2,
  );
  if (tokens.length === 0) return false;
  const supplierTokens = new Set(normalizeCategoryTokens(supplierText));
  return tokens.some((token) => supplierTokens.has(token));
}

function findCategoryKey(categories: Map<string, any>, name: string, fallbackKey: string) {
  const canonicalKey = canonicalCategoryKey(name);
  const related = Array.from(categories.entries()).find(
    ([, category]) =>
      canonicalCategoryKey(category.name) === canonicalKey ||
      categoriesAreCloselyRelated(category.name, name),
  );

  return related?.[0] || fallbackKey;
}

function productsFromFit(productFit: string | null | undefined) {
  return clean(productFit, 1000)
    .split(/,|\band\b|\bincluding\b/i)
    .map((item) => clean(item, 80))
    .filter((item) => item.length > 2)
    .slice(0, 10);
}

function addSeededCategories(categories: Map<string, any>) {
  for (const supplier of seededSuppliers as SeededSupplier[]) {
    if (supplier.verificationStatus !== 'official_site_contact_confirmed') {
      continue;
    }

    const slug = slugify(supplier.niche);
    const pidNiche = findCategoryKey(categories, supplier.niche, `SEEDED-${slug}`);

    if (!categories.has(pidNiche)) {
      categories.set(pidNiche, {
        pidNiche,
        name: supplier.niche,
        slug,
        summary: null,
        suppliers: [],
      });
    }

    const category = categories.get(pidNiche);
    const supplierKey = `${supplier.supplierName}|${supplier.officialWebsite}`.toLowerCase();
    const alreadyListed = category.suppliers.some(
      (item: any) =>
        `${item.supplierName}|${item.officialWebsite}`.toLowerCase() === supplierKey,
    );

    if (!alreadyListed) {
      category.suppliers.push({
        pidSupplier: `SEEDED-${slugify(supplier.supplierName)}-${slugify(supplier.officialWebsite)}`,
        supplierName: supplier.supplierName,
        productFit: supplier.productFit,
        productsMade: productsFromFit(supplier.productFit),
        officialWebsite: supplier.officialWebsite,
        whatsapp: supplier.whatsapp,
        whatsappUrl: supplier.whatsapp ? `https://wa.me/${String(supplier.whatsapp).replace(/[^\d]/g, '')}` : '',
        countryRegion: supplier.countryRegion,
        linkSource: 'seeded_research',
      });
    }
  }
}

async function ensureSupplierCategoryTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS intelligence_supplier_categories (
      id INT NOT NULL AUTO_INCREMENT,
      pidSupplierCategory VARCHAR(80) NOT NULL,
      supplierId VARCHAR(80) NOT NULL,
      nicheId VARCHAR(80) NOT NULL,
      source VARCHAR(80) NOT NULL DEFAULT 'admin',
      createdAt DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NULL,
      UNIQUE KEY intelligence_supplier_categories_pid_key (pidSupplierCategory),
      UNIQUE KEY intelligence_supplier_categories_supplier_niche_key (supplierId, nicheId),
      KEY intelligence_supplier_categories_supplier_idx (supplierId),
      KEY intelligence_supplier_categories_niche_idx (nicheId),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE intelligence_suppliers ADD COLUMN productsMade LONGTEXT NULL
    `);
  } catch {
    // Column already exists.
  }
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();
    await ensureSupplierCategoryTables();

    const rows = await prisma.$queryRaw<
      Array<{
        pidNiche: string;
        name: string;
        slug: string;
        summary: string | null;
        pidSupplier: string | null;
        supplierName: string | null;
        productFit: string | null;
        productsMade: string | null;
        officialWebsite: string | null;
        whatsapp: string | null;
        countryRegion: string | null;
        linkSource: string | null;
      }>
    >`
      SELECT
        n.pidNiche,
        n.name,
        n.slug,
        n.summary,
        s.pidSupplier,
        s.supplierName,
        s.productFit,
        s.productsMade,
        s.officialWebsite,
        s.whatsapp,
        s.countryRegion,
        sc.source AS linkSource
      FROM intelligence_niches n
      LEFT JOIN intelligence_supplier_categories sc
        ON sc.nicheId = n.pidNiche
      LEFT JOIN intelligence_suppliers s
        ON s.pidSupplier = sc.supplierId
        AND s.status = 'published'
        AND s.verificationStatus = 'official_site_contact_confirmed'
        AND s.whatsapp IS NOT NULL
        AND s.whatsapp <> ''
        AND s.lastVerifiedAt IS NOT NULL
      WHERE n.status = 'published'
      ORDER BY n.name ASC, s.supplierName ASC
    `;

    const categories = new Map<string, any>();

    for (const row of rows) {
      const categoryKey = findCategoryKey(categories, row.name, row.pidNiche);
      const existingSeededKey = `SEEDED-${row.slug}`;
      const mapKey = categories.has(existingSeededKey) ? existingSeededKey : categoryKey;

      if (!categories.has(mapKey)) {
        categories.set(mapKey, {
          pidNiche: row.pidNiche,
          name: row.name,
          slug: row.slug,
          summary: row.summary,
          suppliers: [],
        });
      }

      if (row.pidSupplier) {
        const category = categories.get(mapKey);
        const supplierKey = `${row.supplierName}|${row.officialWebsite}`.toLowerCase();
        const alreadyListed = category.suppliers.some(
          (item: any) =>
            `${item.supplierName}|${item.officialWebsite}`.toLowerCase() === supplierKey,
        );

        if (alreadyListed) continue;

        category.suppliers.push({
          pidSupplier: row.pidSupplier,
          supplierName: row.supplierName,
          productFit: row.productFit,
          productsMade: parseProducts(row.productsMade),
          officialWebsite: row.officialWebsite,
          whatsapp: row.whatsapp,
          whatsappUrl: row.whatsapp ? `https://wa.me/${String(row.whatsapp).replace(/[^\d]/g, '')}` : '',
          countryRegion: row.countryRegion,
          linkSource: row.linkSource,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: Array.from(categories.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load categories.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();
    await ensureSupplierCategoryTables();

    const body = await request.json().catch(() => ({}));
    const action = clean(body.action, 40);

    if (action !== 'auto_map') {
      return NextResponse.json(
        { success: false, error: 'Unsupported category action.' },
        { status: 400 },
      );
    }

    const niches = await prisma.$queryRaw<Array<{ pidNiche: string; name: string }>>`
      SELECT pidNiche, name FROM intelligence_niches WHERE status = 'published'
    `;
    const suppliers = await prisma.$queryRaw<
      Array<{
        pidSupplier: string;
        nicheId: string;
        supplierName: string;
        productFit: string;
        productsMade: string | null;
      }>
    >`
      SELECT pidSupplier, nicheId, supplierName, productFit, productsMade
      FROM intelligence_suppliers
      WHERE status = 'published'
    `;

    let created = 0;

    for (const supplier of suppliers) {
      await prisma.$executeRaw`
        INSERT IGNORE INTO intelligence_supplier_categories (
          pidSupplierCategory,
          supplierId,
          nicheId,
          source,
          createdAt,
          updatedAt
        ) VALUES (
          ${randomId('INTSC')},
          ${supplier.pidSupplier},
          ${supplier.nicheId},
          'primary',
          ${new Date()},
          ${new Date()}
        )
      `;

      const supplierText = [
        supplier.supplierName,
        supplier.productFit,
        ...parseProducts(supplier.productsMade),
      ].join(' ');

      for (const niche of niches) {
        if (niche.pidNiche === supplier.nicheId) continue;
        if (!categoryLooksRelevant(niche.name, supplierText)) continue;

        const result: any = await prisma.$executeRaw`
          INSERT IGNORE INTO intelligence_supplier_categories (
            pidSupplierCategory,
            supplierId,
            nicheId,
            source,
            createdAt,
            updatedAt
          ) VALUES (
            ${randomId('INTSC')},
            ${supplier.pidSupplier},
            ${niche.pidNiche},
            'auto_match',
            ${new Date()},
            ${new Date()}
          )
        `;
        created += Number(result || 0);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-link completed. ${created} new supplier/category links added.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to auto-link suppliers.' },
      { status: 500 },
    );
  }
}
