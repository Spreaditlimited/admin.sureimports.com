import { existsSync, statSync } from "node:fs";
import path from "node:path";

import type { ReportCategorySnapshot, ReportSupplier } from "./reportData";

type ReportProduct = {
  slug: string;
  coverImageUrl?: string | null;
  priceNaira: number;
  priceUsdCents: number;
};

const CATEGORY_TERMS: Record<string, string[]> = {
  "auto-accessories-and-spare-parts": ["auto", "automotive", "car ", "vehicle", "brake", "suspension", "filter", "alternator", "headlamp", "shock absorber"],
  "bags-and-backpacks": ["bag", "backpack", "luggage", "duffel", "tote"],
  "beauty-and-cosmetic-packaging": ["cosmetic", "packaging", "bottle", "jar", "tube", "pump", "perfume"],
  "body-cameras": ["body camera", "body-worn", "body worn", "docking station", "police camera", "wearable camera"],
  "cctv-and-security-gadgets": ["cctv", "security camera", "surveillance", "nvr", "dvr", "video doorbell", "access control"],
  "children-and-school-supplies": ["school", "stationery", "notebook", "pencil", "student", "lunch", "backpack", "educational toy", "play dough", "air dry clay", "slime", "children"],
  "cleaning-equipment-and-janitorial-supplies": ["cleaning", "scrubber", "vacuum", "janitorial", "sweeper", "pressure washer", "waste container", "wheelie bin", "trash can"],
  "corporate-gifts-and-promotional-merchandise": ["gift", "promotional", "merchandise", "branded", "notebook", "pen", "tumbler"],
  dehydrators: ["dehydrator", "dryer", "drying"],
  diapers: ["diaper", "nappy", "incontinence", "pull-up", "underpad"],
  "diesel-generators": ["diesel", "generator", "genset"],
  "electric-motorcycles": ["electric motorcycle", "electric scooter", "e-motorcycle", "moped", "two-wheel"],
  "electric-tricycles": ["tricycle", "three-wheel", "three wheel", "tuk tuk", "e-trike"],
  "electric-vehicles": ["electric vehicle", "electric car", " ev ", "new energy vehicle", "battery vehicle"],
  "event-and-conference-materials": ["event", "conference", "lanyard", "badge", "delegate", "promotional"],
  "fashion-accessories": ["fashion", "accessor", "jewelry", "jewellery", "handbag", "belt", "sunglasses", "scarf"],
  "fitness-and-wellness-products": ["fitness", "gym", "yoga", "dumbbell", "kettlebell", "wellness", "massage"],
  "freeze-dryers": ["freeze dryer", "freeze-drying", "freeze drying", "lyophil"],
  "golf-carts": ["golf cart", "golf car", "utility cart", "sightseeing"],
  "hammer-mills": ["hammer mill", "grinding", "crusher", "grain mill", "feed mill"],
  "home-storage-and-organization": ["storage", "organizer", "organiser", "shelving", "bin", "basket", "closet", "wardrobe"],
  "human-hair": ["human hair", "wig", "bundle", "closure", "frontal", "hair extension"],
  "phone-accessories": ["phone", "mobile", "charger", "cable", "power bank", "earbud", "case", "screen protector"],
};

const WEAK_LANGUAGE = [
  "confirm if they are factory",
  "confirm whether they are a factory",
  "showroom-only",
  "manufacturer status was not",
  "official registry status was not",
  "registry status was not",
  "registry status could not",
  "not accessible during",
  "appears to be a manufacturer",
  "claims to be a manufacturer",
  "product fit should be confirmed",
  "nigerian importer",
  "nigerian buyer",
];

function coverPath(product: ReportProduct) {
  const configured = String(product.coverImageUrl || "").trim();
  if (configured.startsWith("/")) {
    return path.join(process.cwd(), "public", configured);
  }
  return path.join(
    process.cwd(),
    "public/assets/images/intelligence-covers",
    `${product.slug}-v1.png`,
  );
}

function supplierText(supplier: ReportSupplier) {
  return [
    supplier.productFit,
    supplier.productsMade.join(" "),
    supplier.buyerNotes,
  ]
    .join(" ")
    .toLowerCase();
}

export function validateReportQuality(
  product: ReportProduct,
  snapshot: ReportCategorySnapshot,
  options: { enforcePrice?: boolean } = {},
) {
  const errors: string[] = [];
  if (snapshot.suppliers.length < 10) {
    errors.push(`requires at least 10 verified manufacturers; found ${snapshot.suppliers.length}`);
  }
  if (options.enforcePrice && (product.priceNaira !== 25_000 || product.priceUsdCents !== 5_000)) {
    errors.push("price must be exactly NGN 25,000 and USD 50");
  }

  const imagePath = coverPath(product);
  if (!existsSync(imagePath)) {
    errors.push("category-specific cover image is missing");
  } else if (statSync(imagePath).size < 150_000) {
    errors.push("category-specific cover image is below the production-quality threshold");
  }

  const names = new Set<string>();
  const sites = new Set<string>();
  const relevanceTerms = CATEGORY_TERMS[snapshot.slug] || [];
  snapshot.suppliers.forEach((supplier, index) => {
    const ref = `supplier ${index + 1} (${supplier.supplierName || "unnamed"})`;
    const name = supplier.supplierName.trim().toLowerCase();
    const site = supplier.officialWebsite.trim().toLowerCase().replace(/\/$/, "");
    if (!name || names.has(name)) errors.push(`${ref}: duplicate or missing manufacturer name`);
    if (!site || sites.has(site)) errors.push(`${ref}: duplicate or missing official website`);
    names.add(name);
    sites.add(site);

    if (supplier.productFit.trim().length < 35) errors.push(`${ref}: product-fit assessment is too thin`);
    if (supplier.productsMade.filter(Boolean).length < 2) errors.push(`${ref}: fewer than two specific product categories`);
    if (supplier.buyerNotes.trim().length < 55) errors.push(`${ref}: Sure Imports assessment is too thin`);
    if (!/^https?:\/\//i.test(supplier.officialWebsite)) errors.push(`${ref}: invalid official website`);
    if (supplier.whatsapp.replace(/\D/g, "").length < 8) errors.push(`${ref}: attributable WhatsApp route is missing`);
    if (!supplier.lastVerifiedAt) errors.push(`${ref}: verification date is missing`);

    const text = supplierText(supplier);
    if (relevanceTerms.length && !relevanceTerms.some((term) => text.includes(term))) {
      errors.push(`${ref}: product evidence does not match ${snapshot.name} (reviewed: ${text.slice(0, 180)})`);
    }
    const weak = WEAK_LANGUAGE.find((phrase) => text.includes(phrase));
    if (weak) errors.push(`${ref}: weak or uncertain language detected (${weak})`);
  });

  if (errors.length) {
    throw new Error(`Report quality gate failed:\n- ${errors.join("\n- ")}`);
  }
}
