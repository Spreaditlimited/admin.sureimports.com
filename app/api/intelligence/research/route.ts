import { NextRequest, NextResponse } from 'next/server';

import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';
import xMail from '@/lib/email/xMail2';
import { prisma } from '@/lib/prisma';
import {
  canonicalCategoryKey,
  categoriesAreCloselyRelated,
} from '@/lib/intelligence/categoryNormalization';
import {
  normalizeSupplierResearchCandidate,
  normalizeSupplierResearchList,
  supplierPassesResearchRules,
  supplierResearchJsonShape,
  SUPPLIER_RESEARCH_RULES,
} from '@/lib/intelligence/supplierResearchRules';
import { assessSupplierSearchQuery } from '@/lib/intelligence/searchQueryPolicy';
import { requireAdmin, unauthorized } from '../../invoicing/_lib/invoicing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type ResearchSupplierDraft = {
  supplierName: string;
  productFit: string;
  productsMade?: string[];
  suggestedCategories?: string[];
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  officialWebsite: string;
  officialContactPage?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  whatsappUrl?: string;
  address?: string;
  countryRegion?: string;
  supplierType?: string;
  manufacturerEvidence?: string;
  chinaRegistryCheck?: string;
  sourceType: string;
  verifiedFrom: string;
  buyerNotes: string;
  verificationStatus: string;
};

type ResearchDraft = {
  nicheName: string;
  summary: string;
  suppliers: ResearchSupplierDraft[];
};

type ResearchJob = {
  id: number;
  pidJob: string;
  nicheName: string;
  targetSupplierCount: number;
  status: string;
  requestNotes: string | null;
  draftJson: string | null;
  errorMessage: string | null;
  openAiResponseId: string | null;
  openAiStatus: string | null;
  openAiSubmittedAt: Date | null;
  openAiCompletedAt: Date | null;
  sourceSearchRequestId: string | null;
  requestedByPidUser: string | null;
  requestedByEmail: string | null;
  createdByPidUser: string | null;
  approvedByPidUser: string | null;
  approvedAt: Date | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  imageOriginalName: string | null;
  imageMimeType: string | null;
  imageUploadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type IntelligenceSearchRequest = {
  pidSearch: string;
  pidUser: string;
  email: string;
  query: string;
  originalQuery: string | null;
  confirmedAt: Date | null;
  targetSupplierCount: number;
  notes: string | null;
  status: string;
  creditCost: number;
  creditReserved: boolean;
  creditSource: string | null;
  relatedPidJob: string | null;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

function dashboardUrl(path: string) {
  const baseUrl =
    process.env.SUREIMPORTS_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://www.sureimports.com';
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function clean(value: unknown, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function randomId(prefix: string) {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function normalizeTargetSupplierCount(value: unknown) {
  const count = Number(value || 3);
  if (!Number.isFinite(count)) return 3;
  return Math.min(10, Math.max(3, Math.round(count)));
}

function normalizeImageFilename(value: string) {
  return clean(value, 255).replace(/[^\w.\- ]+/g, '').trim();
}

async function uploadResearchImage(file: File, pidJob: string) {
  if (!file || file.size <= 0) return null;

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const allowed = ['png', 'jpg', 'jpeg', 'webp'];
  if (!allowed.includes(ext)) {
    throw new Error(`Invalid image type .${ext}. Use png, jpg, jpeg, or webp.`);
  }

  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('Image must be 8MB or smaller.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadBufferToCloudinary(buffer, {
    folder: 'admin-sureimports/intelligence-research',
    publicId: `${pidJob}_PRODUCT_IMAGE`,
    useFilename: false,
    uniqueFilename: false,
    overwrite: true,
    tags: ['supplier-intelligence', 'research-image', pidJob],
  });

  return {
    imageUrl: uploaded.url,
    imagePublicId: uploaded.publicId,
    imageOriginalName: normalizeImageFilename(file.name),
    imageMimeType: clean(file.type, 80) || `image/${ext}`,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureResearchJobsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS intelligence_research_jobs (
      id INT NOT NULL AUTO_INCREMENT,
      pidJob VARCHAR(80) NOT NULL,
      nicheName VARCHAR(180) NOT NULL,
      targetSupplierCount INT NOT NULL DEFAULT 3,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      requestNotes LONGTEXT NULL,
      draftJson LONGTEXT NULL,
      errorMessage LONGTEXT NULL,
      openAiResponseId VARCHAR(100) NULL,
      openAiStatus VARCHAR(40) NULL,
      openAiSubmittedAt DATETIME(3) NULL,
      openAiCompletedAt DATETIME(3) NULL,
      sourceSearchRequestId VARCHAR(80) NULL,
      requestedByPidUser VARCHAR(80) NULL,
      requestedByEmail VARCHAR(255) NULL,
      createdByPidUser VARCHAR(191) NULL,
      approvedByPidUser VARCHAR(191) NULL,
      approvedAt DATETIME(3) NULL,
      imageUrl VARCHAR(800) NULL,
      imagePublicId VARCHAR(180) NULL,
      imageOriginalName VARCHAR(255) NULL,
      imageMimeType VARCHAR(80) NULL,
      imageUploadedAt DATETIME(3) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY intelligence_research_jobs_pidJob_key (pidJob),
      KEY intelligence_research_jobs_status_idx (status),
      KEY intelligence_research_jobs_openai_response_idx (openAiResponseId),
      KEY intelligence_research_jobs_nicheName_idx (nicheName),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  for (const statement of [
    'ALTER TABLE intelligence_research_jobs ADD COLUMN sourceSearchRequestId VARCHAR(80) NULL',
    'ALTER TABLE intelligence_research_jobs ADD COLUMN requestedByPidUser VARCHAR(80) NULL',
    'ALTER TABLE intelligence_research_jobs ADD COLUMN requestedByEmail VARCHAR(255) NULL',
    'ALTER TABLE intelligence_research_jobs ADD COLUMN openAiResponseId VARCHAR(100) NULL',
    'ALTER TABLE intelligence_research_jobs ADD COLUMN openAiStatus VARCHAR(40) NULL',
    'ALTER TABLE intelligence_research_jobs ADD COLUMN openAiSubmittedAt DATETIME(3) NULL',
    'ALTER TABLE intelligence_research_jobs ADD COLUMN openAiCompletedAt DATETIME(3) NULL',
    'ALTER TABLE intelligence_research_jobs ADD COLUMN imageUrl VARCHAR(800) NULL',
    'ALTER TABLE intelligence_research_jobs ADD COLUMN imagePublicId VARCHAR(180) NULL',
    'ALTER TABLE intelligence_research_jobs ADD COLUMN imageOriginalName VARCHAR(255) NULL',
    'ALTER TABLE intelligence_research_jobs ADD COLUMN imageMimeType VARCHAR(80) NULL',
    'ALTER TABLE intelligence_research_jobs ADD COLUMN imageUploadedAt DATETIME(3) NULL',
    'ALTER TABLE intelligence_research_jobs ADD KEY intelligence_research_jobs_search_request_idx (sourceSearchRequestId)',
    'ALTER TABLE intelligence_research_jobs ADD KEY intelligence_research_jobs_openai_response_idx (openAiResponseId)',
  ]) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch {
      // Existing databases may already have these columns/indexes.
    }
  }
}

async function ensureSearchRequestsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS intelligence_search_requests (
      id INT NOT NULL AUTO_INCREMENT,
      pidSearch VARCHAR(80) NOT NULL,
      pidUser VARCHAR(80) NOT NULL,
      email VARCHAR(255) NOT NULL,
      query VARCHAR(220) NOT NULL,
      originalQuery VARCHAR(220) NULL,
      confirmedAt DATETIME(3) NULL,
      targetSupplierCount INT NOT NULL DEFAULT 3,
      notes LONGTEXT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'awaiting_admin',
      creditCost INT NOT NULL DEFAULT 1,
      creditReserved TINYINT(1) NOT NULL DEFAULT 1,
      relatedPidJob VARCHAR(80) NULL,
      adminNotes LONGTEXT NULL,
      progressStage VARCHAR(180) NULL,
      progressPercent INT NOT NULL DEFAULT 0,
      resultSlug VARCHAR(180) NULL,
      creditSource VARCHAR(40) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NULL,
      UNIQUE KEY intelligence_search_requests_pid_key (pidSearch),
      KEY intelligence_search_requests_user_idx (pidUser),
      KEY intelligence_search_requests_status_idx (status),
      KEY intelligence_search_requests_job_idx (relatedPidJob),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  for (const statement of [
    'ALTER TABLE intelligence_search_requests ADD COLUMN progressStage VARCHAR(180) NULL',
    'ALTER TABLE intelligence_search_requests ADD COLUMN progressPercent INT NOT NULL DEFAULT 0',
    'ALTER TABLE intelligence_search_requests ADD COLUMN resultSlug VARCHAR(180) NULL',
    'ALTER TABLE intelligence_search_requests ADD COLUMN creditSource VARCHAR(40) NULL',
    'ALTER TABLE intelligence_search_requests ADD COLUMN originalQuery VARCHAR(220) NULL',
    'ALTER TABLE intelligence_search_requests ADD COLUMN confirmedAt DATETIME(3) NULL',
  ]) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch {
      // Existing databases may already have these columns.
    }
  }
}

async function ensureCreditTablesForRefunds() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS intelligence_credit_accounts (
      id INT NOT NULL AUTO_INCREMENT,
      pidAccount VARCHAR(80) NOT NULL,
      pidUser VARCHAR(80) NOT NULL,
      balance INT NOT NULL DEFAULT 0,
      lifetimeGranted INT NOT NULL DEFAULT 0,
      lifetimeUsed INT NOT NULL DEFAULT 0,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NULL,
      UNIQUE KEY intelligence_credit_accounts_pid_key (pidAccount),
      UNIQUE KEY intelligence_credit_accounts_user_key (pidUser),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS intelligence_credit_transactions (
      id INT NOT NULL AUTO_INCREMENT,
      pidTransaction VARCHAR(80) NOT NULL,
      pidUser VARCHAR(80) NOT NULL,
      amount INT NOT NULL,
      reason VARCHAR(120) NOT NULL,
      reference VARCHAR(160) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY intelligence_credit_transactions_pid_key (pidTransaction),
      KEY intelligence_credit_transactions_user_idx (pidUser),
      KEY intelligence_credit_transactions_reference_idx (reference),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);
}

async function ensureSupplierTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS intelligence_niches (
      id INT NOT NULL AUTO_INCREMENT,
      pidNiche VARCHAR(80) NOT NULL,
      name VARCHAR(160) NOT NULL,
      slug VARCHAR(180) NOT NULL,
      summary TEXT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      sortOrder INT NOT NULL DEFAULT 0,
      createdAt DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NULL,
      UNIQUE KEY intelligence_niches_pidNiche_key (pidNiche),
      UNIQUE KEY intelligence_niches_slug_key (slug),
      KEY intelligence_niches_status_idx (status),
      KEY intelligence_niches_sortOrder_idx (sortOrder),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS intelligence_suppliers (
      id INT NOT NULL AUTO_INCREMENT,
      pidSupplier VARCHAR(80) NOT NULL,
      nicheId VARCHAR(80) NOT NULL,
      supplierName VARCHAR(180) NOT NULL,
      productFit TEXT NOT NULL,
      officialWebsite VARCHAR(500) NOT NULL,
      officialContactPage VARCHAR(500) NULL,
      email VARCHAR(255) NULL,
      phone VARCHAR(120) NULL,
      whatsapp VARCHAR(120) NULL,
      address TEXT NULL,
      countryRegion VARCHAR(180) NULL,
      sourceType VARCHAR(80) NOT NULL,
      verifiedFrom LONGTEXT NOT NULL,
      buyerNotes LONGTEXT NOT NULL,
      verificationStatus VARCHAR(80) NOT NULL,
      lastVerifiedAt DATETIME(3) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      createdAt DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NULL,
      UNIQUE KEY intelligence_suppliers_pidSupplier_key (pidSupplier),
      KEY intelligence_suppliers_nicheId_idx (nicheId),
      KEY intelligence_suppliers_status_idx (status),
      KEY intelligence_suppliers_verificationStatus_idx (verificationStatus),
      KEY intelligence_suppliers_lastVerifiedAt_idx (lastVerifiedAt),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

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
    // Column already exists on databases that have run the migration.
  }
}

function parseDraft(value: string | null): ResearchDraft | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || !Array.isArray(parsed.suppliers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] || '';
}

function normalizeList(value: unknown, maxItems = 12) {
  return normalizeSupplierResearchList(value, maxItems);
}

async function upsertNiche(name: string, summary?: string | null) {
  const nicheName = clean(name, 180);
  const slug = slugify(nicheName);
  if (!nicheName || !slug) return null;
  const canonicalKey = canonicalCategoryKey(nicheName);

  const existing = await prisma.$queryRaw<Array<{ pidNiche: string; name: string; slug: string }>>`
    SELECT pidNiche, name, slug FROM intelligence_niches
  `;
  const exactMatch = existing.find((niche) => niche.slug === slug);
  const relatedMatch =
    exactMatch ||
    existing.find(
      (niche) =>
        canonicalCategoryKey(niche.name) === canonicalKey ||
        categoriesAreCloselyRelated(niche.name, nicheName),
    );

  if (relatedMatch) {
    await prisma.$executeRaw`
      UPDATE intelligence_niches
      SET
        summary = COALESCE(${clean(summary, 2000) || null}, summary),
        status = 'published',
        updatedAt = ${new Date()}
      WHERE pidNiche = ${relatedMatch.pidNiche}
    `;
    return relatedMatch.pidNiche;
  }

  const pidNiche = randomId('INTNICHE');
  await prisma.$executeRaw`
    INSERT INTO intelligence_niches (
      pidNiche,
      name,
      slug,
      summary,
      status,
      createdAt,
      updatedAt
    ) VALUES (
      ${pidNiche},
      ${nicheName},
      ${slug},
      ${clean(summary, 2000) || null},
      'published',
      ${new Date()},
      ${new Date()}
    )
  `;
  return pidNiche;
}

async function linkSupplierToNiche(
  pidSupplier: string,
  pidNiche: string,
  source: 'primary' | 'research_suggestion' | 'auto_match' | 'admin' = 'admin',
) {
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
      ${pidSupplier},
      ${pidNiche},
      ${source},
      ${new Date()},
      ${new Date()}
    )
  `;
}

async function getNicheSlugByPid(pidNiche: string) {
  const rows = await prisma.$queryRaw<Array<{ slug: string }>>`
    SELECT slug FROM intelligence_niches WHERE pidNiche = ${pidNiche} LIMIT 1
  `;
  return rows[0]?.slug || null;
}

function summarizeDraftStatus(draft: ResearchDraft) {
  const suppliers = draft.suppliers || [];
  const statuses = suppliers.map((supplier) => supplier.reviewStatus || 'pending');
  const approvedCount = statuses.filter((status) => status === 'approved').length;
  const rejectedCount = statuses.filter((status) => status === 'rejected').length;
  const pendingCount = statuses.filter((status) => status === 'pending').length;

  if (suppliers.length === 0) return 'rejected';
  if (pendingCount > 0) return 'awaiting_approval';
  if (approvedCount === suppliers.length) return 'approved';
  if (rejectedCount === suppliers.length) return 'rejected';
  if (approvedCount > 0 || rejectedCount > 0) return 'partially_approved';
  return 'awaiting_approval';
}

function normalizeLegacySupplierStatuses(draft: ResearchDraft, jobStatus: string) {
  if (jobStatus !== 'approved' && jobStatus !== 'rejected') return draft;

  return {
    ...draft,
    suppliers: (draft.suppliers || []).map((supplier) => ({
      ...supplier,
      reviewStatus:
        supplier.reviewStatus ||
        (jobStatus === 'approved' ? 'approved' : 'rejected'),
    })),
  };
}

async function unpublishSupplierDraft(supplier: ResearchSupplierDraft) {
  const supplierName = clean(supplier.supplierName, 180);
  const officialWebsite = clean(supplier.officialWebsite, 500);
  if (!supplierName && !officialWebsite) return false;

  const byWebsite = officialWebsite
    ? await prisma.$queryRaw<Array<{ pidSupplier: string }>>`
        SELECT pidSupplier
        FROM intelligence_suppliers
        WHERE officialWebsite = ${officialWebsite}
        LIMIT 1
      `
    : [];
  const byName =
    byWebsite[0] || !supplierName
      ? []
      : await prisma.$queryRaw<Array<{ pidSupplier: string }>>`
          SELECT pidSupplier
          FROM intelligence_suppliers
          WHERE LOWER(supplierName) = LOWER(${supplierName})
          LIMIT 1
        `;

  const pidSupplier = byWebsite[0]?.pidSupplier || byName[0]?.pidSupplier;
  if (!pidSupplier) return false;

  await prisma.$executeRaw`
    DELETE FROM intelligence_supplier_categories
    WHERE supplierId = ${pidSupplier}
  `;

  await prisma.$executeRaw`
    UPDATE intelligence_suppliers
    SET
      status = 'draft',
      updatedAt = ${new Date()}
    WHERE pidSupplier = ${pidSupplier}
  `;

  return true;
}

async function publishSupplierDraft(
  supplier: ResearchSupplierDraft,
  pidNiche: string,
) {
  const supplierName = clean(supplier.supplierName, 180);
  const officialWebsite = clean(supplier.officialWebsite, 500);
  if (!supplierName || !officialWebsite) return false;

  const productsMade = normalizeList(supplier.productsMade);

  const duplicate = await prisma.$queryRaw<Array<{ pidSupplier: string }>>`
    SELECT pidSupplier
    FROM intelligence_suppliers
    WHERE LOWER(supplierName) = LOWER(${supplierName})
      OR officialWebsite = ${officialWebsite}
    LIMIT 1
  `;

  const pidSupplier = duplicate[0]?.pidSupplier || randomId('INTSUP');

  if (duplicate[0]) {
    await prisma.$executeRaw`
      UPDATE intelligence_suppliers
      SET
        supplierName = ${supplierName},
        productFit = ${clean(supplier.productFit, 4000)},
        officialWebsite = ${officialWebsite},
        officialContactPage = ${clean(supplier.officialContactPage, 500) || null},
        email = ${clean(supplier.email, 255) || null},
        phone = ${clean(supplier.phone, 120) || null},
        whatsapp = ${clean(supplier.whatsapp, 120) || null},
        address = ${clean(supplier.address, 2000) || null},
        countryRegion = ${clean(supplier.countryRegion, 180) || null},
        sourceType = ${clean(supplier.sourceType || 'official website + web research', 80)},
        verifiedFrom = ${clean(supplier.verifiedFrom, 4000)},
        buyerNotes = ${clean(supplier.buyerNotes, 4000)},
        productsMade = ${productsMade.length ? JSON.stringify(productsMade) : null},
        verificationStatus = ${clean(supplier.verificationStatus || 'official_site_contact_confirmed', 80)},
        lastVerifiedAt = ${new Date()},
        status = 'published',
        updatedAt = ${new Date()}
      WHERE pidSupplier = ${pidSupplier}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO intelligence_suppliers (
        pidSupplier,
        nicheId,
        supplierName,
        productFit,
        officialWebsite,
        officialContactPage,
        email,
        phone,
        whatsapp,
        address,
        countryRegion,
        sourceType,
        verifiedFrom,
        buyerNotes,
        productsMade,
        verificationStatus,
        lastVerifiedAt,
        status,
        createdAt,
        updatedAt
      ) VALUES (
        ${pidSupplier},
        ${pidNiche},
        ${supplierName},
        ${clean(supplier.productFit, 4000)},
        ${officialWebsite},
        ${clean(supplier.officialContactPage, 500) || null},
        ${clean(supplier.email, 255) || null},
        ${clean(supplier.phone, 120) || null},
        ${clean(supplier.whatsapp, 120) || null},
        ${clean(supplier.address, 2000) || null},
        ${clean(supplier.countryRegion, 180) || null},
        ${clean(supplier.sourceType || 'official website + web research', 80)},
        ${clean(supplier.verifiedFrom, 4000)},
        ${clean(supplier.buyerNotes, 4000)},
        ${productsMade.length ? JSON.stringify(productsMade) : null},
        ${clean(supplier.verificationStatus || 'official_site_contact_confirmed', 80)},
        ${new Date()},
        'published',
        ${new Date()},
        ${new Date()}
      )
    `;
  }

  await linkSupplierToNiche(pidSupplier, pidNiche, 'primary');

  return true;
}

type SupplierResearchInput = {
  nicheName: string;
  targetSupplierCount: number;
  requestNotes: string;
  imageUrl?: string | null;
};

function supplierResearchPrompt(input: SupplierResearchInput) {
  return [
    'You are a supplier research analyst for Sure Imports, a China sourcing and shipping company serving importers worldwide.',
    `Research the niche: ${input.nicheName}.`,
    input.imageUrl
      ? 'An image is attached. Use it only to understand the exact product being searched for, then apply the same supplier research rules below without changing them.'
      : '',
    `Return ${input.targetSupplierCount} solid supplier candidates.`,
    input.requestNotes ? `Admin notes: ${input.requestNotes}` : '',
    'Success means every returned candidate is a high-confidence direct manufacturer, names the specific product categories it manufactures, has category-specific production evidence, has an attributable official WhatsApp route, and contains a publication-ready commercial assessment. Return fewer candidates rather than filling the list with a weak or uncertain supplier.',
    'Before returning JSON, check every candidate against every rule. Remove any candidate whose manufacturer status, product fit, or official contact attribution is uncertain.',
    ...SUPPLIER_RESEARCH_RULES,
    'Return only JSON with this exact shape:',
    JSON.stringify(supplierResearchJsonShape(input.nicheName)),
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function submitSupplierResearch(input: SupplierResearchInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const prompt = supplierResearchPrompt(input);

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.6-sol',
      reasoning: { effort: 'max' },
      tools: [{ type: 'web_search_preview' }],
      background: true,
      store: true,
      input: input.imageUrl
        ? [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: prompt },
                { type: 'input_image', image_url: input.imageUrl },
              ],
            },
          ]
        : prompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenAI research failed: ${response.status} ${clean(errorText, 500)}`);
  }

  const data = await response.json();
  if (!data.id) {
    throw new Error('OpenAI research did not return a response ID.');
  }
  return data;
}

async function retrieveSupplierResearch(responseId: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const response = await fetch(
    `https://api.openai.com/v1/responses/${encodeURIComponent(responseId)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    },
  );
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `OpenAI research status check failed: ${response.status} ${clean(errorText, 500)}`,
    );
  }
  return response.json();
}

async function cancelSupplierResearch(responseId: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const response = await fetch(
    `https://api.openai.com/v1/responses/${encodeURIComponent(responseId)}/cancel`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    },
  );
  if (response.ok) return;

  const errorText = await response.text().catch(() => '');
  if (response.status === 400 || response.status === 404) {
    // The response may have reached a terminal state or expired between the
    // admin seeing the button and clicking it. Local cancellation still stops
    // this job from being polled or published.
    return;
  }
  throw new Error(
    `OpenAI research cancellation failed: ${response.status} ${clean(errorText, 500)}`,
  );
}

function parseSupplierResearchResponse(
  data: any,
  input: SupplierResearchInput,
) {
  if (data.status !== 'completed') {
    throw new Error(
      clean(
        data.error?.message ||
          data.incomplete_details?.reason ||
          `OpenAI research ended with status ${data.status || 'unknown'}.`,
        500,
      ),
    );
  }
  const outputText =
    data.output_text ||
    data.output
      ?.flatMap((item: any) => item.content || [])
      ?.map((content: any) => content.text || '')
      ?.join('\n') ||
    '';
  const jsonText = extractJson(outputText);
  const draft = JSON.parse(jsonText) as ResearchDraft;

  if (!Array.isArray(draft.suppliers) || draft.suppliers.length === 0) {
    throw new Error('Research returned no supplier candidates.');
  }

  const suppliers = draft.suppliers
    .slice(0, input.targetSupplierCount)
    .map(normalizeSupplierResearchCandidate)
    .filter(supplierPassesResearchRules);

  if (suppliers.length === 0) {
    throw new Error('Research returned no manufacturer suppliers with public WhatsApp evidence.');
  }

  return {
    // The admin-selected niche is authoritative. Model-generated wording must
    // not create a second, near-duplicate catalogue category during approval.
    nicheName: clean(input.nicheName, 180),
    summary: clean(draft.summary, 1200),
    suppliers,
  };
}

function openAiFailureMessage(data: any) {
  return clean(
    data?.error?.message ||
      data?.incomplete_details?.reason ||
      `OpenAI research ended with status ${data?.status || 'unknown'}.`,
    500,
  );
}

async function failResearchJob(job: ResearchJob, message: string, openAiStatus?: string) {
  const affected = await prisma.$executeRaw`
    UPDATE intelligence_research_jobs
    SET
      status = 'failed',
      openAiStatus = ${clean(openAiStatus, 40) || 'failed'},
      openAiCompletedAt = ${new Date()},
      errorMessage = ${clean(message, 4000) || 'Research failed.'},
      updatedAt = ${new Date()}
    WHERE pidJob = ${job.pidJob}
      AND status <> 'cancelled'
  `;

  if (affected > 0 && job.sourceSearchRequestId) {
    await updateLinkedSearchRequest(job.pidJob, 'failed', message);
    await refundLinkedSearchCredit(
      job.pidJob,
      message || 'Research failed and the credit was returned.',
    );
  }
}

async function applySupplierResearchResponse(job: ResearchJob, data: any) {
  const openAiStatus = clean(data?.status, 40) || 'unknown';
  if (openAiStatus === 'queued' || openAiStatus === 'in_progress') {
    await prisma.$executeRaw`
      UPDATE intelligence_research_jobs
      SET
        status = 'running',
        openAiStatus = ${openAiStatus},
        errorMessage = NULL,
        updatedAt = ${new Date()}
      WHERE pidJob = ${job.pidJob}
        AND status IN ('queued', 'running')
    `;
    return;
  }

  const staleFinalizingBefore = new Date(Date.now() - 2 * 60 * 1000);
  const claimed = await prisma.$executeRaw`
    UPDATE intelligence_research_jobs
    SET
      status = 'finalizing',
      openAiStatus = ${openAiStatus},
      updatedAt = ${new Date()}
    WHERE pidJob = ${job.pidJob}
      AND (
        status IN ('queued', 'running')
        OR (status = 'finalizing' AND updatedAt < ${staleFinalizingBefore})
      )
  `;
  if (claimed === 0) return;

  if (openAiStatus !== 'completed') {
    await failResearchJob(job, openAiFailureMessage(data), openAiStatus);
    return;
  }

  try {
    const draft = parseSupplierResearchResponse(data, {
      nicheName: job.nicheName,
      targetSupplierCount: job.targetSupplierCount,
      requestNotes: job.requestNotes || '',
      imageUrl: job.imageUrl,
    });

    const finalized = await prisma.$executeRaw`
      UPDATE intelligence_research_jobs
      SET
        status = 'awaiting_approval',
        openAiStatus = 'completed',
        openAiCompletedAt = ${new Date()},
        draftJson = ${JSON.stringify(draft)},
        errorMessage = NULL,
        updatedAt = ${new Date()}
      WHERE pidJob = ${job.pidJob}
        AND status = 'finalizing'
    `;

    if (finalized > 0 && job.sourceSearchRequestId) {
      await updateLinkedSearchRequest(job.pidJob, 'awaiting_approval');
    }
  } catch (error: any) {
    await failResearchJob(
      job,
      error?.message || 'Research returned an invalid supplier draft.',
      'completed',
    );
  }
}

async function refreshRunningResearchJobs(limit = 5) {
  const staleFinalizingBefore = new Date(Date.now() - 2 * 60 * 1000);
  const jobs = await prisma.$queryRaw<ResearchJob[]>`
    SELECT *
    FROM intelligence_research_jobs
    WHERE (
        status IN ('queued', 'running')
        OR (status = 'finalizing' AND updatedAt < ${staleFinalizingBefore})
      )
      AND openAiResponseId IS NOT NULL
    ORDER BY createdAt ASC
    LIMIT ${limit}
  `;

  await Promise.allSettled(
    jobs.map(async (job) => {
      const data = await retrieveSupplierResearch(job.openAiResponseId as string);
      await applySupplierResearchResponse(job, data);
    }),
  );
}

async function listJobs() {
  await ensureResearchJobsTable();
  return prisma.$queryRaw<ResearchJob[]>`
    SELECT
      id,
      pidJob,
      nicheName,
      targetSupplierCount,
      status,
      requestNotes,
      draftJson,
      errorMessage,
      openAiResponseId,
      openAiStatus,
      openAiSubmittedAt,
      openAiCompletedAt,
      sourceSearchRequestId,
      requestedByPidUser,
      requestedByEmail,
      createdByPidUser,
      approvedByPidUser,
      approvedAt,
      imageUrl,
      imagePublicId,
      imageOriginalName,
      imageMimeType,
      imageUploadedAt,
      createdAt,
      updatedAt
    FROM intelligence_research_jobs
    ORDER BY
      CASE
        WHEN status = 'awaiting_approval' AND sourceSearchRequestId IS NOT NULL THEN 1
        WHEN status = 'awaiting_approval' THEN 2
        WHEN sourceSearchRequestId IS NOT NULL THEN 3
        ELSE 4
      END,
      createdAt DESC
    LIMIT 50
  `;
}

async function listSearchRequests() {
  await ensureSearchRequestsTable();
  return prisma.$queryRaw<IntelligenceSearchRequest[]>`
    SELECT
      pidSearch,
      pidUser,
      email,
      query,
      originalQuery,
      confirmedAt,
      targetSupplierCount,
      notes,
      status,
      creditCost,
      creditReserved,
      creditSource,
      relatedPidJob,
      adminNotes,
      createdAt,
      updatedAt
    FROM intelligence_search_requests
    ORDER BY createdAt DESC
    LIMIT 100
  `;
}

async function updateLinkedSearchRequest(
  pidJob: string,
  status: string,
  adminNotes?: string | null,
  decisionSummary?: {
    approvedCount: number;
    rejectedCount: number;
    totalCount: number;
  },
  resultSlug?: string | null,
) {
  await ensureSearchRequestsTable();
  const requests = await prisma.$queryRaw<IntelligenceSearchRequest[]>`
    SELECT
      pidSearch,
      pidUser,
      email,
      query,
      originalQuery,
      confirmedAt,
      targetSupplierCount,
      notes,
      status,
      creditCost,
      creditReserved,
      relatedPidJob,
      adminNotes,
      createdAt,
      updatedAt
    FROM intelligence_search_requests
    WHERE relatedPidJob = ${pidJob}
  `;

  await prisma.$executeRaw`
    UPDATE intelligence_search_requests
    SET
      status = ${status},
      adminNotes = ${adminNotes || null},
      resultSlug = COALESCE(${resultSlug || null}, resultSlug),
      progressStage = ${
        status === 'approved'
          ? 'Sure Imports specialist check completed. Your result is ready.'
          : status === 'rejected'
            ? 'Sure Imports specialist check completed. This result was declined.'
            : status === 'awaiting_approval'
              ? 'Supplier research is complete and awaiting Sure Imports specialist review.'
              : status === 'running'
                ? 'Supplier research is in progress.'
                : status === 'failed'
                  ? 'Supplier research could not be completed.'
                  : status === 'cancelled'
                    ? 'Supplier research was stopped.'
                    : null
      },
      progressPercent = ${
        ['approved', 'rejected', 'failed', 'cancelled'].includes(status)
          ? 100
          : status === 'awaiting_approval'
            ? 90
            : status === 'running'
              ? 20
              : 0
      },
      updatedAt = ${new Date()}
    WHERE relatedPidJob = ${pidJob}
  `;

  for (const request of requests) {
    if (request.status !== status) {
      await notifySearchRequestDecision(request, status, adminNotes, decisionSummary);
    }
  }
}

async function notifySearchRequestDecision(
  request: IntelligenceSearchRequest,
  status: string,
  adminNotes?: string | null,
  decisionSummary?: {
    approvedCount: number;
    rejectedCount: number;
    totalCount: number;
  },
) {
  if (!request.email) return;

  if (status === 'approved') {
    const hasRejected =
      decisionSummary && decisionSummary.rejectedCount > 0;
    const summaryText = decisionSummary
      ? hasRejected
        ? `Our team approved <b>${decisionSummary.approvedCount}</b> supplier candidate(s) and removed <b>${decisionSummary.rejectedCount}</b> that did not pass review.`
        : `Our team approved all <b>${decisionSummary.approvedCount}</b> supplier candidate(s) from the search.`
      : 'Our team has approved supplier candidates from the search.';

    await xMail({
      xEmail: request.email,
      xTitle: `Supplier search approved - ${request.query}`,
      xBodyTitle: 'Your Supplier Intelligence result is ready',
      xBody1: `Hello,<br />Sure Imports has completed specialist review for your supplier search: <b>${request.query}</b>.`,
      xBody2:
        `${summaryText}<br /><br />Log in to your dashboard to view the approved supplier intelligence result and buyer notes before contacting or paying any supplier.`,
      xButtonTitle: 'View Result',
      xButtonLink: dashboardUrl('/dashboard/intelligence'),
    });
    return;
  }

  if (status === 'rejected') {
    await xMail({
      xEmail: request.email,
      xTitle: `Supplier search declined - ${request.query}`,
      xBodyTitle: 'Your supplier search was not approved',
      xBody1: `Hello,<br />Sure Imports has completed specialist review for your supplier search: <b>${request.query}</b>.`,
      xBody2:
        adminNotes ||
        'The supplier candidates did not pass our review. Your search credit has been returned to your account.',
      xButtonTitle: 'Search Again',
      xButtonLink: dashboardUrl('/dashboard/intelligence'),
    });
  }
}

async function refundLinkedSearchCredit(pidJob: string, reason: string) {
  await ensureSearchRequestsTable();
  await ensureCreditTablesForRefunds();

  const requests = await prisma.$queryRaw<Array<{ pidSearch: string }>>`
    SELECT pidSearch
    FROM intelligence_search_requests
    WHERE relatedPidJob = ${pidJob}
      AND creditReserved = 1
    LIMIT 1
  `;
  if (!requests[0]) return false;
  return refundSearchCreditById(requests[0].pidSearch, reason);
}

async function refundSearchCreditById(pidSearch: string, reason: string) {
  await ensureSearchRequestsTable();
  await ensureCreditTablesForRefunds();

  return prisma.$transaction(async (tx) => {
    const requests = await tx.$queryRaw<IntelligenceSearchRequest[]>`
      SELECT
        pidSearch,
        pidUser,
        email,
        query,
        originalQuery,
        confirmedAt,
        targetSupplierCount,
        notes,
        status,
        creditCost,
        creditReserved,
        creditSource,
        relatedPidJob,
        adminNotes,
        createdAt,
        updatedAt
      FROM intelligence_search_requests
      WHERE pidSearch = ${pidSearch}
      LIMIT 1
      FOR UPDATE
    `;
    const request = requests[0];
    if (!request || !request.creditReserved || request.creditCost <= 0) {
      return false;
    }

    const released = await tx.$executeRaw`
      UPDATE intelligence_search_requests
      SET
        creditReserved = 0,
        adminNotes = ${reason},
        updatedAt = ${new Date()}
      WHERE pidSearch = ${request.pidSearch}
        AND creditReserved = 1
    `;
    if (released === 0) return false;

    await tx.$executeRaw`
      UPDATE intelligence_credit_accounts
      SET
        balance = balance + ${request.creditCost},
        lifetimeUsed = GREATEST(0, lifetimeUsed - ${request.creditCost}),
        updatedAt = ${new Date()}
      WHERE pidUser = ${request.pidUser}
    `;

    await tx.$executeRaw`
      INSERT INTO intelligence_credit_transactions (
        pidTransaction,
        pidUser,
        amount,
        reason,
        reference,
        createdAt
      ) VALUES (
        ${randomId('INTCTX')},
        ${request.pidUser},
        ${request.creditCost},
        'search_request_refunded',
        ${request.pidSearch},
        ${new Date()}
      )
    `;
    return true;
  });
}

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const isCronRequest = Boolean(
      cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`,
    );
    if (!isCronRequest) {
      const admin = await requireAdmin();
      if (!admin) return unauthorized();
    }
    await ensureResearchJobsTable();

    if (isCronRequest || request.nextUrl.searchParams.get('refresh') === '1') {
      await refreshRunningResearchJobs();
    }

    if (isCronRequest) {
      return NextResponse.json({ success: true, refreshed: true });
    }

    const [jobs, searchRequests] = await Promise.all([
      listJobs(),
      listSearchRequests(),
    ]);
    return NextResponse.json({ success: true, data: jobs, searchRequests });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch research jobs.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();
    await ensureResearchJobsTable();
    await ensureSearchRequestsTable();

    const isMultipart = request.headers
      .get('content-type')
      ?.toLowerCase()
      .includes('multipart/form-data');
    const formData = isMultipart ? await request.formData() : null;
    const body = formData ? {} : await request.json().catch(() => ({}));
    const sourceSearchRequestId = clean(
      formData?.get('sourceSearchRequestId') ?? body.sourceSearchRequestId,
      80,
    );
    const formImage = formData?.get('image');
    const imageFile = formImage instanceof File && formImage.size > 0 ? formImage : null;
    let nicheName = clean(formData?.get('nicheName') ?? body.nicheName, 180);
    let requestNotes = clean(formData?.get('requestNotes') ?? body.requestNotes, 4000);
    let targetSupplierCount = normalizeTargetSupplierCount(
      formData?.get('targetSupplierCount') ?? body.targetSupplierCount,
    );
    let requestedByPidUser: string | null = null;
    let requestedByEmail: string | null = null;

    if (sourceSearchRequestId) {
      const requests = await prisma.$queryRaw<IntelligenceSearchRequest[]>`
        SELECT
          pidSearch,
          pidUser,
          email,
          query,
          originalQuery,
          confirmedAt,
          targetSupplierCount,
          notes,
          status,
          creditCost,
          creditReserved,
          relatedPidJob,
          adminNotes,
          createdAt,
          updatedAt
        FROM intelligence_search_requests
        WHERE pidSearch = ${sourceSearchRequestId}
        LIMIT 1
      `;
      const searchRequest = requests[0];

      if (!searchRequest) {
        return NextResponse.json(
          { success: false, error: 'Search request was not found.' },
          { status: 404 },
        );
      }

      if (
        searchRequest.relatedPidJob ||
        searchRequest.status !== 'awaiting_admin'
      ) {
        return NextResponse.json(
          { success: false, error: 'This search request is no longer awaiting approval.' },
          { status: 409 },
        );
      }

      nicheName = clean(searchRequest.query, 180);
      requestNotes = clean(searchRequest.notes, 4000);
      targetSupplierCount = normalizeTargetSupplierCount(
        searchRequest.targetSupplierCount,
      );
      requestedByPidUser = searchRequest.pidUser;
      requestedByEmail = searchRequest.email;
    }

    if (!imageFile) {
      const assessment = assessSupplierSearchQuery(nicheName);
      if (assessment.status !== 'valid' || !assessment.canonicalQuery) {
        return NextResponse.json(
          { success: false, error: assessment.message },
          { status: 400 },
        );
      }
      nicheName = assessment.canonicalQuery;
    }

    if (!nicheName) {
      if (!imageFile) {
        return NextResponse.json(
          { success: false, error: 'Niche name or product image is required.' },
          { status: 400 },
        );
      }
      nicheName = 'Product shown in uploaded image';
    }

    const pidJob = randomId('INTRES');
    const uploadedImage = imageFile
      ? await uploadResearchImage(imageFile, pidJob)
      : null;

    await prisma.$transaction(async (tx) => {
      if (sourceSearchRequestId) {
        const claimed = await tx.$executeRaw`
        UPDATE intelligence_search_requests
        SET
          status = 'running',
          relatedPidJob = ${pidJob},
          updatedAt = ${new Date()}
        WHERE pidSearch = ${sourceSearchRequestId}
          AND status = 'awaiting_admin'
          AND relatedPidJob IS NULL
        `;
        if (claimed === 0) {
          throw new Error('This search request was already handled by another admin.');
        }
      }

      await tx.$executeRaw`
        INSERT INTO intelligence_research_jobs (
          pidJob,
          nicheName,
          targetSupplierCount,
          status,
          requestNotes,
          sourceSearchRequestId,
          requestedByPidUser,
          requestedByEmail,
          createdByPidUser,
          imageUrl,
          imagePublicId,
          imageOriginalName,
          imageMimeType,
          imageUploadedAt
        ) VALUES (
          ${pidJob},
          ${nicheName},
          ${targetSupplierCount},
          'queued',
          ${requestNotes || null},
          ${sourceSearchRequestId || null},
          ${requestedByPidUser},
          ${requestedByEmail},
          ${admin.pidUser},
          ${uploadedImage?.imageUrl || null},
          ${uploadedImage?.imagePublicId || null},
          ${uploadedImage?.imageOriginalName || null},
          ${uploadedImage?.imageMimeType || null},
          ${uploadedImage ? new Date() : null}
        )
      `;
    });

    try {
      const response = await submitSupplierResearch({
        nicheName,
        targetSupplierCount,
        requestNotes,
        imageUrl: uploadedImage?.imageUrl || null,
      });

      await prisma.$executeRaw`
        UPDATE intelligence_research_jobs
        SET
          status = ${response.status === 'queued' ? 'queued' : 'running'},
          openAiResponseId = ${clean(response.id, 100)},
          openAiStatus = ${clean(response.status, 40) || 'queued'},
          openAiSubmittedAt = ${new Date()},
          errorMessage = NULL,
          updatedAt = ${new Date()}
        WHERE pidJob = ${pidJob}
      `;

      const submittedRows = await prisma.$queryRaw<ResearchJob[]>`
        SELECT * FROM intelligence_research_jobs WHERE pidJob = ${pidJob} LIMIT 1
      `;
      if (
        submittedRows[0] &&
        response.status !== 'queued' &&
        response.status !== 'in_progress'
      ) {
        await applySupplierResearchResponse(submittedRows[0], response);
      }
    } catch (error: any) {
      const failedRows = await prisma.$queryRaw<ResearchJob[]>`
        SELECT * FROM intelligence_research_jobs WHERE pidJob = ${pidJob} LIMIT 1
      `;
      if (failedRows[0]) {
        await failResearchJob(
          failedRows[0],
          error?.message || 'Research failed.',
          'failed',
        );
      }
      throw error;
    }

    const [jobs, searchRequests] = await Promise.all([
      listJobs(),
      listSearchRequests(),
    ]);
    return NextResponse.json(
      { success: true, data: jobs, searchRequests, pidJob },
      { status: 202 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to run research.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();
    await ensureResearchJobsTable();
    await ensureSupplierTables();

    const body = await request.json().catch(() => ({}));
    const pidJob = clean(body.pidJob, 80);
    const action = clean(body.action, 40);

    if (action === 'reject_request') {
      const pidSearch = clean(body.pidSearch, 80);
      if (!pidSearch) {
        return NextResponse.json(
          { success: false, error: 'A valid search request id is required.' },
          { status: 400 },
        );
      }

      const requests = await prisma.$queryRaw<IntelligenceSearchRequest[]>`
        SELECT
          pidSearch,
          pidUser,
          email,
          query,
          originalQuery,
          confirmedAt,
          targetSupplierCount,
          notes,
          status,
          creditCost,
          creditReserved,
          creditSource,
          relatedPidJob,
          adminNotes,
          createdAt,
          updatedAt
        FROM intelligence_search_requests
        WHERE pidSearch = ${pidSearch}
        LIMIT 1
      `;
      const searchRequest = requests[0];
      if (!searchRequest || searchRequest.status !== 'awaiting_admin') {
        return NextResponse.json(
          { success: false, error: 'This request is no longer awaiting review.' },
          { status: 409 },
        );
      }

      const reason =
        'Sure Imports declined this request before external research began. Your search credit has been returned.';
      const rejected = await prisma.$executeRaw`
        UPDATE intelligence_search_requests
        SET
          status = 'rejected',
          progressStage = 'Request declined before research',
          progressPercent = 100,
          adminNotes = ${reason},
          updatedAt = ${new Date()}
        WHERE pidSearch = ${pidSearch}
          AND status = 'awaiting_admin'
      `;
      if (rejected === 0) {
        return NextResponse.json(
          { success: false, error: 'This request was already handled by another admin.' },
          { status: 409 },
        );
      }
      await refundSearchCreditById(pidSearch, reason);
      await notifySearchRequestDecision(searchRequest, 'rejected', reason);

      const [jobs, searchRequests] = await Promise.all([
        listJobs(),
        listSearchRequests(),
      ]);
      return NextResponse.json({ success: true, data: jobs, searchRequests });
    }

    if (
      !pidJob ||
      ![
        'approve',
        'reject',
        'stop',
        'restart',
        'approve_supplier',
        'reject_supplier',
        'unapprove_supplier',
      ].includes(action)
    ) {
      return NextResponse.json(
        { success: false, error: 'Valid pidJob and action are required.' },
        { status: 400 },
      );
    }

    const rows = await prisma.$queryRaw<ResearchJob[]>`
      SELECT * FROM intelligence_research_jobs WHERE pidJob = ${pidJob} LIMIT 1
    `;
    const job = rows[0];
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Research job not found.' },
        { status: 404 },
      );
    }

    if (action === 'restart') {
      if (!['failed', 'cancelled'].includes(job.status)) {
        return NextResponse.json(
          { success: false, error: 'Only failed or cancelled research can be restarted.' },
          { status: 409 },
        );
      }

      const claimed = await prisma.$executeRaw`
        UPDATE intelligence_research_jobs
        SET
          status = 'restarting',
          draftJson = NULL,
          errorMessage = NULL,
          openAiResponseId = NULL,
          openAiStatus = 'restarting',
          openAiSubmittedAt = NULL,
          openAiCompletedAt = NULL,
          updatedAt = ${new Date()}
        WHERE pidJob = ${pidJob}
          AND status IN ('failed', 'cancelled')
      `;

      if (claimed === 0) {
        return NextResponse.json(
          { success: false, error: 'This research job was already restarted by another admin.' },
          { status: 409 },
        );
      }

      if (job.sourceSearchRequestId) {
        await updateLinkedSearchRequest(
          pidJob,
          'running',
          'Supplier research has been restarted by Sure Imports.',
        );
      }

      try {
        const response = await submitSupplierResearch({
          nicheName: job.nicheName,
          targetSupplierCount: job.targetSupplierCount,
          requestNotes: job.requestNotes || '',
          imageUrl: job.imageUrl,
        });

        await prisma.$executeRaw`
          UPDATE intelligence_research_jobs
          SET
            status = ${response.status === 'queued' ? 'queued' : 'running'},
            openAiResponseId = ${clean(response.id, 100)},
            openAiStatus = ${clean(response.status, 40) || 'queued'},
            openAiSubmittedAt = ${new Date()},
            errorMessage = NULL,
            updatedAt = ${new Date()}
          WHERE pidJob = ${pidJob}
            AND status = 'restarting'
        `;

        const restartedRows = await prisma.$queryRaw<ResearchJob[]>`
          SELECT * FROM intelligence_research_jobs WHERE pidJob = ${pidJob} LIMIT 1
        `;
        if (
          restartedRows[0] &&
          response.status !== 'queued' &&
          response.status !== 'in_progress'
        ) {
          await applySupplierResearchResponse(restartedRows[0], response);
        }
      } catch (error: any) {
        await failResearchJob(
          { ...job, status: 'restarting' },
          error?.message || 'Research restart failed.',
          'failed',
        );
        throw error;
      }

      const [jobs, searchRequests] = await Promise.all([
        listJobs(),
        listSearchRequests(),
      ]);
      return NextResponse.json({ success: true, data: jobs, searchRequests });
    }

    if (action === 'stop') {
      if (!['queued', 'running', 'finalizing'].includes(job.status)) {
        return NextResponse.json(
          { success: false, error: 'This research job is no longer running.' },
          { status: 409 },
        );
      }

      if (job.openAiResponseId) {
        await cancelSupplierResearch(job.openAiResponseId);
      }

      const affected = await prisma.$executeRaw`
        UPDATE intelligence_research_jobs
        SET
          status = 'cancelled',
          openAiStatus = 'cancelled',
          openAiCompletedAt = ${new Date()},
          errorMessage = 'Stopped by admin.',
          updatedAt = ${new Date()}
        WHERE pidJob = ${pidJob}
          AND status IN ('queued', 'running', 'finalizing')
      `;

      if (affected > 0 && job.sourceSearchRequestId) {
        const stopReason =
          'Sure Imports stopped this supplier search before completion. Your search credit has been returned.';
        await updateLinkedSearchRequest(pidJob, 'cancelled', stopReason);
        await refundLinkedSearchCredit(pidJob, stopReason);
      }

      const [jobs, searchRequests] = await Promise.all([
        listJobs(),
        listSearchRequests(),
      ]);
      return NextResponse.json({ success: true, data: jobs, searchRequests });
    }

    let draft = parseDraft(job.draftJson);
    if (!draft && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: 'This job has no valid draft to approve.' },
        { status: 400 },
      );
    }

    if (action === 'reject') {
      const rejectedDraft = draft
        ? {
            ...draft,
            suppliers: (draft.suppliers || []).map((supplier) => ({
              ...supplier,
              reviewStatus: 'rejected' as const,
              reviewedAt: new Date().toISOString(),
            })),
          }
        : null;

      await prisma.$executeRaw`
        UPDATE intelligence_research_jobs
        SET
          status = 'rejected',
          draftJson = ${rejectedDraft ? JSON.stringify(rejectedDraft) : job.draftJson},
          updatedAt = ${new Date()}
        WHERE pidJob = ${pidJob}
      `;
      await updateLinkedSearchRequest(
        pidJob,
        'rejected',
        'Admin rejected this search request. Your credit has been returned.',
      );
      await refundLinkedSearchCredit(
        pidJob,
        'Admin rejected this search request. Your credit has been returned.',
      );
      const [jobs, searchRequests] = await Promise.all([
        listJobs(),
        listSearchRequests(),
      ]);
      return NextResponse.json({ success: true, data: jobs, searchRequests });
    }

    if (!draft) {
      return NextResponse.json(
        { success: false, error: 'This job has no valid draft to approve.' },
        { status: 400 },
      );
    }
    draft = normalizeLegacySupplierStatuses(draft, job.status);

    const nicheName = clean(draft.nicheName || job.nicheName, 180);
    const pidNiche = await upsertNiche(nicheName, draft.summary);
    if (!pidNiche) {
      return NextResponse.json(
        { success: false, error: 'Could not create the primary product category.' },
        { status: 400 },
      );
    }
    const resultSlug = await getNicheSlugByPid(pidNiche);

    if (
      action === 'approve_supplier' ||
      action === 'reject_supplier' ||
      action === 'unapprove_supplier'
    ) {
      const supplierIndex = Number(body.supplierIndex);
      if (!Number.isInteger(supplierIndex) || supplierIndex < 0 || supplierIndex >= draft.suppliers.length) {
        return NextResponse.json(
          { success: false, error: 'Valid supplierIndex is required.' },
          { status: 400 },
        );
      }

      if (action === 'approve_supplier') {
        await publishSupplierDraft(draft.suppliers[supplierIndex], pidNiche);
      }
      if (action === 'unapprove_supplier') {
        await unpublishSupplierDraft(draft.suppliers[supplierIndex]);
      }

      draft.suppliers[supplierIndex] = {
        ...draft.suppliers[supplierIndex],
        reviewStatus:
          action === 'approve_supplier'
            ? 'approved'
            : action === 'reject_supplier'
              ? 'rejected'
              : 'pending',
        reviewedAt: new Date().toISOString(),
      };
    } else {
      for (let index = 0; index < (draft.suppliers || []).length; index += 1) {
        const supplier = draft.suppliers[index];
        if (supplier.reviewStatus === 'rejected') continue;
        await publishSupplierDraft(supplier, pidNiche);
        draft.suppliers[index] = {
          ...supplier,
          reviewStatus: 'approved',
          reviewedAt: new Date().toISOString(),
        };
      }
    }

    const nextStatus = summarizeDraftStatus(draft);
    const decisionCounts = (() => {
      const statuses = (draft.suppliers || []).map(
        (supplier) => supplier.reviewStatus || 'pending',
      );
      return {
        totalCount: statuses.length,
        approvedCount: statuses.filter((status) => status === 'approved').length,
        rejectedCount: statuses.filter((status) => status === 'rejected').length,
      };
    })();

    await prisma.$executeRaw`
      UPDATE intelligence_research_jobs
      SET
        status = ${nextStatus},
        draftJson = ${JSON.stringify(draft)},
        approvedByPidUser = ${nextStatus === 'approved' || nextStatus === 'partially_approved' ? admin.pidUser : null},
        approvedAt = ${nextStatus === 'approved' || nextStatus === 'partially_approved' ? new Date() : null},
        updatedAt = ${new Date()}
      WHERE pidJob = ${pidJob}
    `;

    if (nextStatus === 'approved' || nextStatus === 'partially_approved') {
      await updateLinkedSearchRequest(
        pidJob,
        'approved',
        nextStatus === 'partially_approved'
          ? `${decisionCounts.approvedCount} supplier candidate(s) approved. ${decisionCounts.rejectedCount} candidate(s) did not pass Sure Imports specialist review.`
          : `${decisionCounts.approvedCount} supplier candidate(s) approved by Sure Imports specialists.`,
        decisionCounts,
        resultSlug,
      );
    } else if (nextStatus === 'rejected') {
      await updateLinkedSearchRequest(
        pidJob,
        'rejected',
        'Admin rejected all supplier candidates. Your credit has been returned.',
      );
      await refundLinkedSearchCredit(
        pidJob,
        'Admin rejected all supplier candidates. Your credit has been returned.',
      );
    } else {
      await updateLinkedSearchRequest(pidJob, 'awaiting_approval');
    }

    const [jobs, searchRequests] = await Promise.all([
      listJobs(),
      listSearchRequests(),
    ]);
    return NextResponse.json({ success: true, data: jobs, searchRequests });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update research job.' },
      { status: 500 },
    );
  }
}
