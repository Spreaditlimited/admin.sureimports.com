export type SupplierResearchCandidate = {
  supplierName?: string;
  productFit?: string;
  productsMade?: unknown;
  suggestedCategories?: unknown;
  officialWebsite?: string;
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
  sourceType?: string;
  verifiedFrom?: string;
  buyerNotes?: string;
  verificationStatus?: string;
};

export type NormalizedSupplierResearchCandidate = {
  supplierName: string;
  productFit: string;
  productsMade: string[];
  suggestedCategories: string[];
  officialWebsite: string;
  officialContactPage: string;
  email: string;
  phone: string;
  whatsapp: string;
  whatsappUrl: string;
  address: string;
  countryRegion: string;
  supplierType: string;
  manufacturerEvidence: string;
  chinaRegistryCheck: string;
  sourceType: string;
  verifiedFrom: string;
  buyerNotes: string;
  verificationStatus: string;
};

export const SUPPLIER_RESEARCH_RULE_VERSION = 'manufacturer-whatsapp-registry-v1';

export const SUPPLIER_RESEARCH_RULES = [
  'Use web search to prioritize official company websites, official contact pages, manufacturer pages, and credible company information.',
  'Suppliers MUST be manufacturers/factories/brand owners with evidence that they make or own the product line. Do not include sourcing agents, trading companies, distributors, retailers, dropshippers, marketplaces, or other middlemen.',
  'Every supplier MUST have a public WhatsApp number that can be attributed to the supplier from an official website, official contact page, official social profile linked from the official site, or another strongly attributable public company source.',
  'Where possible, check an official Chinese business registration source such as the National Enterprise Credit Information Publicity System or another official registry/government/company registration source to determine the company status. If this cannot be checked, record that it was not found or not accessible; this is not a deal breaker if the manufacturer and public WhatsApp evidence are strong.',
  'Do not invent phone numbers, WhatsApp numbers, addresses, emails, websites, certifications, factory locations, or contacts.',
  'If a direct contact detail is not clearly verified, leave that field empty. Do not return a supplier without a clearly public WhatsApp number.',
  'Use professional, confident, simple language. Do not say "footer says" or "I found on the website".',
  'Every supplier must have an officialWebsite and officialContactPage when possible.',
  'In verifiedFrom, include the evidence that the supplier is a manufacturer and where the public WhatsApp number was attributed from.',
];

export function supplierResearchJsonShape(nicheName: string) {
  return {
    ruleVersion: SUPPLIER_RESEARCH_RULE_VERSION,
    nicheName,
    summary: 'Short practical summary for Nigerian importers.',
    suppliers: [
      {
        supplierName: 'Company name',
        productFit: 'Products this supplier fits',
        productsMade: ['Baby diapers', 'Sanitary pads', 'Adult diapers'],
        suggestedCategories: ['Baby diapers', 'Sanitary pads'],
        officialWebsite: 'https://example.com',
        officialContactPage: 'https://example.com/contact',
        email: '',
        phone: '',
        whatsapp: '+8613800138000',
        whatsappUrl: 'https://wa.me/8613800138000',
        address: '',
        countryRegion: 'China/city or region if verified',
        supplierType: 'manufacturer',
        manufacturerEvidence:
          'Concise evidence that this is a manufacturer/factory/brand owner, not a middleman.',
        chinaRegistryCheck:
          'Official registry status if checked; otherwise say not found/not accessible.',
        sourceType: 'official website + web research',
        verifiedFrom:
          'Concise verification summary covering official website, manufacturer evidence, WhatsApp attribution, and registry check where possible.',
        buyerNotes:
          'Practical buyer notes for Nigerian importers before payment.',
        verificationStatus: 'official_site_contact_confirmed',
      },
    ],
  };
}

export function cleanSupplierResearchValue(value: unknown, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

export function normalizeSupplierResearchList(value: unknown, maxItems = 12) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanSupplierResearchValue(item, 140))
      .filter(Boolean)
      .slice(0, maxItems);
  }

  return String(value || '')
    .split(/[,;\n]/)
    .map((item) => cleanSupplierResearchValue(item, 140))
    .filter(Boolean)
    .slice(0, maxItems);
}

function getWhatsAppHref(value?: string | null) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

export function normalizeSupplierResearchCandidate(
  supplier: SupplierResearchCandidate,
) {
  const whatsapp = cleanSupplierResearchValue(supplier.whatsapp, 120);
  const whatsappUrl =
    cleanSupplierResearchValue(supplier.whatsappUrl, 500) ||
    getWhatsAppHref(whatsapp);

  return {
    supplierName: cleanSupplierResearchValue(supplier.supplierName, 180),
    productFit: cleanSupplierResearchValue(supplier.productFit, 2000),
    productsMade: normalizeSupplierResearchList(supplier.productsMade),
    suggestedCategories: normalizeSupplierResearchList(
      supplier.suggestedCategories,
      8,
    ),
    officialWebsite: cleanSupplierResearchValue(supplier.officialWebsite, 500),
    officialContactPage: cleanSupplierResearchValue(
      supplier.officialContactPage,
      500,
    ),
    email: cleanSupplierResearchValue(supplier.email, 255),
    phone: cleanSupplierResearchValue(supplier.phone, 120),
    whatsapp,
    whatsappUrl,
    address: cleanSupplierResearchValue(supplier.address, 1000),
    countryRegion: cleanSupplierResearchValue(supplier.countryRegion, 180),
    supplierType: cleanSupplierResearchValue(
      supplier.supplierType || 'manufacturer',
      80,
    ),
    manufacturerEvidence: cleanSupplierResearchValue(
      supplier.manufacturerEvidence,
      1200,
    ),
    chinaRegistryCheck: cleanSupplierResearchValue(
      supplier.chinaRegistryCheck,
      1200,
    ),
    sourceType: cleanSupplierResearchValue(
      supplier.sourceType || 'official website + web research',
      80,
    ),
    verifiedFrom: cleanSupplierResearchValue(supplier.verifiedFrom, 4000),
    buyerNotes: cleanSupplierResearchValue(supplier.buyerNotes, 4000),
    verificationStatus: cleanSupplierResearchValue(
      supplier.verificationStatus || 'official_site_contact_confirmed',
      80,
    ),
  };
}

export function supplierPassesResearchRules(
  supplier: NormalizedSupplierResearchCandidate,
) {
  const evidence = [
    supplier.supplierType,
    supplier.manufacturerEvidence,
    supplier.verifiedFrom,
  ].join(' ');
  const manufacturerTerms =
    /\b(manufacturer|factory|producer|brand owner|own factory|production)\b/i;
  const blockedMiddlemanTerms =
    /\b(agent|middleman|trading company|trading|trader|distributor|retailer|dropship|dropshipper|marketplace|broker|wholesaler only)\b/i;

  return Boolean(
    supplier.supplierName &&
      supplier.officialWebsite &&
      supplier.whatsapp &&
      supplier.whatsappUrl &&
      manufacturerTerms.test(evidence) &&
      !blockedMiddlemanTerms.test(evidence),
  );
}
