import { existsSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

import type { ReportCategorySnapshot, ReportSupplier } from "./reportData";

const NAVY = "#071426";
const SLATE = "#334155";
const MUTED = "#64748b";
const ORANGE = "#f97316";
const PALE = "#fff7ed";
const LINE = "#e2e8f0";

type ProductDetails = {
  slug?: string;
  title: string;
  subtitle?: string | null;
  editionLabel: string;
  coverImageUrl?: string | null;
};

function localCoverImage(product: ProductDetails) {
  const configured = String(product.coverImageUrl || "").trim();
  if (configured.startsWith("/")) {
    const configuredPath = path.join(process.cwd(), "public", configured);
    if (existsSync(configuredPath)) return configuredPath;
  }
  if (product.slug) {
    const categoryPath = path.join(
      process.cwd(),
      "public/assets/images/intelligence-covers",
      `${product.slug}-v1.png`,
    );
    if (existsSync(categoryPath)) return categoryPath;
  }
  return null;
}

function collectPdf(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function addPageTitle(
  doc: PDFKit.PDFDocument,
  eyebrow: string,
  title: string,
  intro?: string,
) {
  doc
    .fillColor(ORANGE)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(eyebrow.toUpperCase(), 54, 54, {
      characterSpacing: 1.8,
    });
  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(25)
    .text(title, 54, 78, { width: 487 });
  if (intro) {
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(10.5)
      .text(intro, 54, doc.y + 12, {
        width: 487,
        lineGap: 4,
      });
  }
  doc
    .moveTo(54, doc.y + 18)
    .lineTo(541, doc.y + 18)
    .strokeColor(LINE)
    .lineWidth(1)
    .stroke();
  doc.y += 38;
}

function label(doc: PDFKit.PDFDocument, text: string) {
  const y = doc.y;
  doc
    .fillColor(ORANGE)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(text.toUpperCase(), 54, y, {
      width: 487,
      characterSpacing: 1.1,
    });
}

function paragraph(
  doc: PDFKit.PDFDocument,
  text: string,
  options: PDFKit.Mixins.TextOptions = {},
) {
  const y = doc.y;
  doc
    .fillColor(SLATE)
    .font("Helvetica")
    .fontSize(10)
    .text(text, 54, y, {
      width: 487,
      lineGap: 4,
      ...options,
    });
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > 770) doc.addPage();
}

function manufacturerConfidenceNote(supplier: ReportSupplier) {
  const sentenceCaseProduct = (value: string) => {
    if (
      /^(?:Bluetooth|Wi-?Fi|USB|LED|HD|TWS|OEM|ODM|PVC|PET|CCTV|POS|EV|PV)\b/i.test(
        value,
      )
    ) {
      return value;
    }
    return value.charAt(0).toLocaleLowerCase("en") + value.slice(1);
  };
  const productCategories = Array.from(
    new Set(
      supplier.productsMade
        .map((item) => item.trim())
        .map((item) => item.replace(/[.;:,]+$/, ""))
        .map(sentenceCaseProduct)
        .filter(Boolean),
    ),
  );
  if (!productCategories.length) {
    throw new Error(
      `Cannot publish ${supplier.supplierName}: specific product categories are required.`,
    );
  }
  const productScope = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  }).format(productCategories);
  return `${supplier.supplierName} is a direct manufacturer of ${productScope}. Sure Imports has reviewed its production capability and confirmed its official company contact routes, including WhatsApp ${supplier.whatsapp}. For a high-value order, we strongly recommend physical factory verification by our China team before substantial funds are committed.`;
}

function contactLine(
  doc: PDFKit.PDFDocument,
  name: string,
  value: string,
  link?: string,
) {
  if (!value) return;
  ensureSpace(doc, 35);
  doc
    .fillColor(MUTED)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(name.toUpperCase(), 54, doc.y, {
      width: 125,
    });
  doc
    .fillColor(NAVY)
    .font("Helvetica")
    .fontSize(9.5)
    .text(value, 184, doc.y - 10, {
      width: 350,
      link,
      underline: Boolean(link),
    });
  doc.moveDown(0.75);
}

function supplierPage(
  doc: PDFKit.PDFDocument,
  supplier: ReportSupplier,
  index: number,
  total: number,
) {
  doc.addPage();
  addPageTitle(
    doc,
    `Supplier ${String(index + 1).padStart(2, "0")} of ${total}`,
    supplier.supplierName,
  );

  label(doc, "Product fit");
  paragraph(
    doc,
    supplier.productFit ||
      "Product fit should be confirmed directly with the supplier.",
  );

  if (supplier.productsMade.length) {
    doc.moveDown(1);
    label(doc, "Products made");
    paragraph(doc, supplier.productsMade.join("  •  "));
  }

  doc.moveDown(1.1);
  const assessment =
    supplier.buyerNotes ||
    "This direct manufacturer is included for its category fit and verified official contact route. Confirm current specifications, capacity, samples, certifications and commercial terms for your order.";
  doc.font("Helvetica").fontSize(9.5);
  const assessmentHeight = doc.heightOfString(assessment, {
    width: 451,
    lineGap: 3,
  });
  const assessmentBoxHeight = Math.max(104, 57 + assessmentHeight);
  ensureSpace(doc, assessmentBoxHeight + 18);
  const assessmentBoxY = doc.y;
  doc
    .roundedRect(54, assessmentBoxY, 487, assessmentBoxHeight, 12)
    .fill(PALE);
  const boxY = assessmentBoxY + 17;
  doc
    .fillColor(ORANGE)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("SURE IMPORTS ASSESSMENT", 72, boxY, {
      characterSpacing: 1.1,
    });
  doc
    .fillColor(NAVY)
    .font("Helvetica")
    .fontSize(9.5)
    .text(
      assessment,
      72,
      boxY + 22,
      { width: 451, lineGap: 3 },
    );
  doc.y = assessmentBoxY + assessmentBoxHeight + 18;

  label(doc, "Official contact routes");
  doc.moveDown(0.6);
  contactLine(
    doc,
    "Website",
    supplier.officialWebsite,
    supplier.officialWebsite,
  );
  contactLine(
    doc,
    "Contact page",
    supplier.officialContactPage,
    supplier.officialContactPage,
  );
  contactLine(
    doc,
    "Email",
    supplier.email,
    supplier.email ? `mailto:${supplier.email}` : undefined,
  );
  contactLine(doc, "Phone", supplier.phone);
  contactLine(
    doc,
    "WhatsApp",
    supplier.whatsapp,
    supplier.whatsapp
      ? `https://wa.me/${supplier.whatsapp.replace(/[^\d]/g, "")}`
      : undefined,
  );
  contactLine(doc, "Location", supplier.countryRegion);
  contactLine(doc, "Address", supplier.address);

  const verification = manufacturerConfidenceNote(supplier);
  doc.font("Helvetica").fontSize(10);
  const verificationHeight = doc.heightOfString(verification, {
    width: 487,
    lineGap: 4,
  });
  ensureSpace(doc, verificationHeight + 62);
  doc.moveDown(0.8);
  label(doc, "Manufacturer confidence note");
  paragraph(doc, verification);
  doc.moveDown(0.7);
  doc
    .fillColor(MUTED)
    .font("Helvetica-Oblique")
    .fontSize(8.5)
    .text(
      supplier.lastVerifiedAt
        ? `Last verification recorded: ${new Date(
            supplier.lastVerifiedAt,
          ).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}`
        : "Verification date: report publication edition.",
      54,
      doc.y,
      { width: 487 },
    );
}

export async function renderSupplierIntelligencePdf(
  product: ProductDetails,
  snapshot: ReportCategorySnapshot,
) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 54, right: 54, bottom: 56, left: 54 },
    bufferPages: true,
  });
  const output = collectPdf(doc);
  const logoPath = path.join(
    process.cwd(),
    "public/assets/images/logo-white.png",
  );

  doc.info.Title = product.title;
  doc.info.Author = "Sure Imports";
  doc.info.Subject = "Supplier Intelligence Report";
  doc.info.Keywords =
    "supplier intelligence, China suppliers, sourcing, importing";

  const coverImage = localCoverImage(product);
  doc.rect(0, 0, 595.28, 841.89).fill(NAVY);
  if (coverImage) {
    doc.image(coverImage, 0, 0, {
      cover: [595.28, 841.89],
      align: "center",
      valign: "center",
    });
    doc.rect(0, 0, 595.28, 841.89).fillOpacity(0.18).fill(NAVY);
    doc.rect(0, 0, 595.28, 410).fillOpacity(0.82).fill(NAVY);
    doc.rect(0, 672, 595.28, 169.89).fillOpacity(0.88).fill(NAVY);
    doc.fillOpacity(1);
  } else {
    doc.circle(510, 90, 170).fillOpacity(0.08).fill(ORANGE).fillOpacity(1);
  }
  doc.image(logoPath, 54, 48, { width: 170 });
  doc.rect(54, 166, 4, 47).fill(ORANGE);
  doc
    .fillColor(ORANGE)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("SUPPLIER INTELLIGENCE", 72, 168, {
      characterSpacing: 2.2,
    });
  doc
    .fillColor("#cbd5e1")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("SOURCING DECISION DOCUMENT", 72, 194, {
      characterSpacing: 1.5,
    });
  const coverTitle = product.title.replace(
    /\s+Supplier Intelligence Report$/i,
    "",
  );
  const coverTitleSize =
    coverTitle.length > 65 ? 31 : coverTitle.length > 42 ? 36 : 43;
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(coverTitleSize)
    .text(coverTitle, 54, 238, {
      width: 475,
      lineGap: 2,
    });
  if (product.subtitle) {
    doc
      .fillColor("#cbd5e1")
      .font("Helvetica")
      .fontSize(11.5)
      .text(product.subtitle, 54, doc.y + 15, {
        width: 455,
        lineGap: 3,
      });
  }
  doc.fillColor(ORANGE).roundedRect(54, 644, 238, 38, 19).fill();
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      `${product.editionLabel.toUpperCase()}  •  ${snapshot.suppliers.length} VERIFIED MANUFACTURERS`,
      70,
      658,
      { width: 208 },
    );
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("SURE IMPORTS", 54, 722, { characterSpacing: 1.5 });
  doc
    .fillColor("#cbd5e1")
    .font("Helvetica")
    .fontSize(9.5)
    .text("www.sureimports.com", 54, 747);
  doc.text("WhatsApp only: +234 803 764 9956", 54, 769);
  doc.text("hello@sureimports.com", 54, 791);

  doc.addPage();
  addPageTitle(
    doc,
    "Why this report",
    "Direct manufacturers. Real sourcing intelligence.",
    "The manufacturers in this report are drawn from the supplier network and research process Sure Imports uses when sourcing products for customers. It gives you a focused, commercially useful shortlist—not an unfiltered marketplace directory.",
  );
  const guidance = [
    [
      "Start with direct manufacturers",
      "Each supplier is selected for direct manufacturing capability and category fit—not simply copied from a marketplace listing.",
    ],
    [
      "Use proven sourcing intelligence",
      "The shortlist comes from the manufacturer network and sourcing process Sure Imports uses for real customer orders.",
    ],
    [
      "Compare what matters",
      "Review product specialisation, manufacturer evidence, location, official contact routes and practical buyer notes in one place.",
    ],
    [
      "Move confidently to enquiry",
      "Use the report to request current quotations, samples, certifications, production timelines and terms for your specific order.",
    ],
  ];
  const guidanceStartY = doc.y;
  guidance.forEach(([title, text], index) => {
    const cardY = guidanceStartY + index * 101;
    doc
      .roundedRect(54, cardY, 487, 89, 10)
      .fill(index % 2 === 0 ? "#f8fafc" : PALE);
    doc
      .fillColor(ORANGE)
      .circle(82, cardY + 44.5, 16)
      .fill();
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(String(index + 1), 66, cardY + 38, {
        width: 32,
        align: "center",
      });
    doc
      .fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(11.5)
      .text(title, 112, cardY + 17, { width: 405 });
    doc
      .fillColor(SLATE)
      .font("Helvetica")
      .fontSize(9.25)
      .text(text, 112, cardY + 39, { width: 405, lineGap: 2.5 });
  });
  doc.y = guidanceStartY + guidance.length * 101 + 2;
  doc
    .fillColor(MUTED)
    .font("Helvetica-Oblique")
    .fontSize(8.25)
    .text(
      "Current capacity, quotations and commercial terms can change. Confirm the specifications and terms for your order before payment.",
      54,
      doc.y,
      { width: 487, align: "center", lineGap: 2 },
    );

  doc.addPage();
  addPageTitle(
    doc,
    "Sure Imports in China",
    "Confidence backed by physical reach",
    "Sure Imports has a real operating presence in China and sources directly for customers. Our supplier intelligence is therefore supported by practical, on-the-ground capability when an order requires deeper assurance.",
  );
  const assuranceCards = [
    [
      "A direct-manufacturer standard",
      "Every company included in this report has passed our manufacturer, category-fit and official-contact requirements. Weak or uncertain candidates are excluded rather than passed to the buyer.",
    ],
    [
      "A China-based team",
      "Our work does not end with a digital shortlist. Sure Imports operates in China, sources products for customers and can provide practical support between supplier selection and shipment.",
    ],
    [
      "Physical verification for substantial orders",
      "For high-value purchases, we strongly recommend a separately scoped factory visit. Our China team can verify the operating premises, visible production activity and order-specific details before substantial funds are committed.",
    ],
  ];
  const assuranceStartY = doc.y;
  assuranceCards.forEach(([title, text], index) => {
    const cardY = assuranceStartY + index * 119;
    doc
      .roundedRect(54, cardY, 487, 105, 12)
      .fill(index === 2 ? PALE : "#f8fafc");
    doc
      .fillColor(ORANGE)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(String(index + 1).padStart(2, "0"), 72, cardY + 20, {
        width: 30,
      });
    doc
      .fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(11.5)
      .text(title, 112, cardY + 18, { width: 405 });
    doc
      .fillColor(SLATE)
      .font("Helvetica")
      .fontSize(9.25)
      .text(text, 112, cardY + 43, { width: 405, lineGap: 3 });
  });
  const assuranceFooterY = assuranceStartY + assuranceCards.length * 119 + 8;
  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Recommended for high-value orders", 54, assuranceFooterY, {
      width: 487,
      align: "center",
    });
  doc
    .fillColor(MUTED)
    .font("Helvetica-Oblique")
    .fontSize(8.25)
    .text(
      "A physical visit provides additional point-in-time evidence. It does not guarantee future performance, so specifications, commercial protections and payment terms should still be agreed for the order.",
      72,
      assuranceFooterY + 24,
      { width: 451, align: "center", lineGap: 2.5 },
    );

  doc.addPage();
  addPageTitle(
    doc,
    "Decision view",
    `${snapshot.name}: supplier comparison`,
    "Use this overview to build a shortlist, then read the detailed profiles before contacting a supplier.",
  );
  snapshot.suppliers.forEach((supplier, index) => {
    ensureSpace(doc, 55);
    doc
      .fillColor(index % 2 === 0 ? "#f8fafc" : "#ffffff")
      .roundedRect(54, doc.y, 487, 45, 8)
      .fill();
    doc
      .fillColor(ORANGE)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(String(index + 1).padStart(2, "0"), 68, doc.y + 9, { width: 28 });
    doc
      .fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(supplier.supplierName, 104, doc.y, { width: 210 });
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(8.5)
      .text(supplier.countryRegion || "Location to confirm", 326, doc.y - 11, {
        width: 195,
        align: "right",
      });
    doc.y += 33;
  });

  snapshot.suppliers.forEach((supplier, index) =>
    supplierPage(doc, supplier, index, snapshot.suppliers.length),
  );

  doc.addPage();
  doc.rect(0, 0, 595.28, 841.89).fill(NAVY);
  doc
    .fillColor(ORANGE)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("SHIP WITH SURE IMPORTS", 54, 78, { characterSpacing: 2 });
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(34)
    .text("Your supplier is only half the journey.", 54, 120, {
      width: 465,
      lineGap: 4,
    });
  doc
    .fillColor("#cbd5e1")
    .font("Helvetica")
    .fontSize(14)
    .text(
      "Before paying, understand how your goods will be received in China, consolidated, measured and moved to their destination.",
      54,
      250,
      { width: 450, lineGap: 6 },
    );
  const shipItems = [
    "Plan the shipment before supplier payment",
    "Receive goods at the Sure Imports China warehouse",
    "Coordinate consolidation and shipment preparation",
    "Get a clearer route from supplier to destination",
  ];
  shipItems.forEach((item, index) => {
    const y = 370 + index * 58;
    doc
      .fillColor(ORANGE)
      .circle(64, y + 5, 5)
      .fill();
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(item, 84, y, { width: 420 });
  });
  doc.fillColor(ORANGE).roundedRect(54, 650, 300, 54, 27).fill();
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("PLAN YOUR SHIPMENT", 82, 671, {
      link: "https://www.sureimports.com/ship-with-us",
    });
  doc
    .fillColor("#cbd5e1")
    .font("Helvetica")
    .fontSize(9.5)
    .text("www.sureimports.com/ship-with-us", 54, 730);
  doc.text("WhatsApp only: +234 803 764 9956", 54, 752);
  doc.text("hello@sureimports.com", 54, 774);

  const range = doc.bufferedPageRange();
  for (let pageIndex = 1; pageIndex < range.count - 1; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    doc
      .fillColor("#94a3b8")
      .font("Helvetica")
      .fontSize(8)
      .text("SURE IMPORTS  •  SUPPLIER INTELLIGENCE", 54, 770, {
        width: 380,
        lineBreak: false,
      });
    doc.text(`${pageIndex + 1} / ${range.count}`, 470, 770, {
      width: 70,
      align: "right",
      lineBreak: false,
    });
  }

  doc.end();
  return output;
}
