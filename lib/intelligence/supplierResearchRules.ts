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

export const SUPPLIER_RESEARCH_RULE_VERSION =
  'manufacturer-assurance-curated-taxonomy-global-v4';

export const SUPPLIER_RESEARCH_RULES = [
  'Use web search to prioritize official company websites, official contact pages, manufacturer pages, and credible company information.',
  'Suppliers MUST be manufacturers/factories/brand owners with evidence that they make or own the product line. Do not include sourcing agents, trading companies, distributors, retailers, dropshippers, marketplaces, or other middlemen.',
  'productsMade MUST contain the specific product categories manufactured by the company. Use concrete names such as "TWS earbuds", "Bluetooth speakers", "chargers" and "power banks". Never use generic phrases such as "relevant products", "various products" or "products in this category".',
  'suggestedCategories are internal product-specialisation labels only. They must never be treated as automatically approved report categories; the admin research niche remains the single primary catalogue category.',
  'Every supplier MUST have a public WhatsApp number that can be attributed to the supplier from an official website, official contact page, official social profile linked from the official site, or another strongly attributable public company source.',
  'Where possible, check an official Chinese business registration source such as the National Enterprise Credit Information Publicity System or another official registry/government/company registration source. Keep the result in chinaRegistryCheck as an internal research record. Never put registry-access limitations in verifiedFrom or buyerNotes.',
  'Do not invent phone numbers, WhatsApp numbers, addresses, emails, websites, certifications, factory locations, or contacts.',
  'If a direct contact detail is not clearly verified, leave that field empty. Do not return a supplier without a clearly public WhatsApp number.',
  'Use professional, confident, publication-ready language. Communicate the conclusion of the research, not the browsing process.',
  'Never write buyer-facing phrases such as "the site says", "the page lists", "identified online", "registry was not accessible", "not found", "appears to be", "may be a manufacturer", or similar research narration.',
  'If the available evidence does not support a high-confidence direct-manufacturer conclusion, exclude the supplier instead of publishing a hesitant qualification.',
  'Write for importers in any country. Do not assume the buyer is Nigerian or located in any particular market.',
  'When regulations, electrical standards, warranty coverage, shipping restrictions, taxes, certifications, product labeling, or market fit may vary, tell the buyer to confirm the requirements in their destination country or target market.',
  'Every supplier must have an officialWebsite and officialContactPage when possible.',
  'Write verifiedFrom as an internal evidence record containing the specific manufacturer evidence and WhatsApp attribution. The PDF renderer converts this evidence into a buyer-facing manufacturer confidence note.',
  'Write buyerNotes as a confident commercial-fit assessment. Do not question whether an approved supplier is a factory, workshop, trader, or showroom. Approved suppliers have already passed the direct-manufacturer rule.',
  'For high-value orders, recommend a scoped physical factory verification by the Sure Imports China team. Present this as an additional point-in-time verification step, not as a guarantee of future supplier performance.',
];

export function supplierResearchJsonShape(nicheName: string) {
  return {
    ruleVersion: SUPPLIER_RESEARCH_RULE_VERSION,
    nicheName,
    summary: 'Short practical summary for importers in any country.',
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
          'Internal registry result, including access limitations where relevant. This is not buyer-facing copy.',
        sourceType: 'official website + web research',
        verifiedFrom:
          'Internal evidence record: direct-manufacturer evidence, production evidence and attribution for the official WhatsApp/contact channels. Do not narrate browsing or include registry-access limitations.',
        buyerNotes:
          'Confident, publication-ready commercial-fit assessment with practical order-specific questions. Do not question the approved manufacturer status.',
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
  const weakManufacturerConclusion =
    /\b(appears to be|may be|might be|possibly|could not verify|not accessible|not found|unclear whether)\b/i;

  return Boolean(
    supplier.supplierName &&
      supplier.productsMade.length > 0 &&
      supplier.officialWebsite &&
      supplier.whatsapp &&
      supplier.whatsappUrl &&
      manufacturerTerms.test(evidence) &&
      !blockedMiddlemanTerms.test(evidence) &&
      !weakManufacturerConclusion.test(supplier.verifiedFrom),
  );
}
