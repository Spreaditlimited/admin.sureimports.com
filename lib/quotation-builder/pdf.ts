import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { jsPDF } from 'jspdf';
import autoTableImport from 'jspdf-autotable';

import type { CalculatedQuote, QuoteBuildInput } from './types';

const autoTable = typeof autoTableImport === 'function'
  ? autoTableImport
  : (autoTableImport as unknown as { default: typeof autoTableImport }).default;

const NAVY: [number, number, number] = [7, 22, 43];
const NAVY_2: [number, number, number] = [16, 36, 62];
const ORANGE: [number, number, number] = [243, 106, 33];
const SLATE: [number, number, number] = [71, 85, 105];
const MUTED: [number, number, number] = [104, 119, 141];
const LIGHT: [number, number, number] = [244, 247, 250];
const BORDER: [number, number, number] = [220, 228, 237];

function safe(value: unknown) {
  return String(value || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/₦/g, 'NGN ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
    .trim();
}

function ngn(value: number) {
  return `NGN ${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function number(value: number, digits = 2) {
  return Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: digits });
}

function logoDataUrl() {
  const buffer = readFileSync(join(process.cwd(), 'public/assets/images/logo-white.png'));
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

export type QuotePdfImage = { dataUrl: string; format: 'JPEG' | 'PNG'; width: number; height: number };

function contain(sourceWidth: number, sourceHeight: number, x: number, y: number, width: number, height: number) {
  const ratio = Math.min(width / Math.max(1, sourceWidth), height / Math.max(1, sourceHeight));
  const fittedWidth = sourceWidth * ratio;
  const fittedHeight = sourceHeight * ratio;
  return {
    x: x + (width - fittedWidth) / 2,
    y: y + (height - fittedHeight) / 2,
    width: fittedWidth,
    height: fittedHeight,
  };
}

export function createQuotationPdf(
  input: QuoteBuildInput,
  calculated: CalculatedQuote,
  quotationNumber: string,
  preparedAt: Date,
  images: QuotePdfImage[],
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 16;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, height, 'F');
  doc.setFillColor(...NAVY_2);
  doc.rect(0, 88, width, 126, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, height - 7, width, 7, 'F');
  doc.addImage(logoDataUrl(), 'PNG', margin, 17, 62, 9.9, undefined, 'FAST');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ORANGE);
  doc.setFontSize(9);
  doc.text('COMMERCIAL PRODUCT QUOTATION', margin, 57);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(27);
  const titleLines = doc.splitTextToSize(safe(input.title || 'Product Quotation'), 176);
  doc.text(titleLines, margin, 70);
  const introY = 70 + titleLines.length * 10 + 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(199, 210, 223);
  doc.setFontSize(10.5);
  const introLines = doc.splitTextToSize(safe(input.introduction), 166);
  doc.text(introLines.slice(0, 4), margin, introY);

  const galleryTop = Math.max(112, introY + Math.min(introLines.length, 4) * 5 + 6);
  const galleryHeight = 85;
  const visible = images.slice(0, 4);
  if (visible.length) {
    const gap = 4;
    const cols = visible.length === 1 ? 1 : 2;
    const rows = Math.ceil(visible.length / cols);
    const cardW = cols === 1 ? 178 : (178 - gap) / 2;
    const cardH = (galleryHeight - gap * (rows - 1)) / rows;
    visible.forEach((image, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = margin + col * (cardW + gap);
      const y = galleryTop + row * (cardH + gap);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, cardW, cardH, 4, 4, 'F');
      const fitted = contain(image.width, image.height, x + 2, y + 2, cardW - 4, cardH - 4);
      doc.addImage(image.dataUrl, image.format, fitted.x, fitted.y, fitted.width, fitted.height, undefined, 'FAST');
    });
  } else {
    doc.setDrawColor(69, 88, 111);
    doc.setTextColor(143, 160, 182);
    doc.roundedRect(margin, galleryTop, 178, galleryHeight, 4, 4, 'S');
    doc.setFontSize(10);
    doc.text('Product imagery was not supplied separately from the source document.', width / 2, galleryTop + galleryHeight / 2, { align: 'center' });
  }

  const metaY = 252;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(1);
  doc.line(margin, metaY, margin, metaY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(143, 160, 182);
  doc.setFontSize(7);
  doc.text('PREPARED FOR', margin + 7, metaY + 4);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(safe(input.customerName), margin + 7, metaY + 11);
  doc.setFontSize(8.5);
  doc.setTextColor(199, 210, 223);
  doc.text(safe(input.customerLocation), margin + 7, metaY + 17);
  doc.setTextColor(143, 160, 182);
  doc.setFontSize(7);
  doc.text('QUOTATION REFERENCE', 128, metaY + 4);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9.5);
  doc.text(quotationNumber, 128, metaY + 11);
  doc.setTextColor(143, 160, 182);
  doc.setFontSize(7);
  doc.text('PREPARED', 128, metaY + 17);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text(preparedAt.toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' }), 128, metaY + 22);

  const addContentHeader = (pageLabel: string) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, width, height, 'F');
    doc.addImage(logoDataUrl(), 'PNG', margin, 13, 52, 8.3, undefined, 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(quotationNumber, width - margin, 16, { align: 'right' });
    doc.text(pageLabel, width - margin, 21, { align: 'right' });
    doc.setDrawColor(...BORDER);
    doc.line(margin, 27, width - margin, 27);
  };

  doc.addPage();
  addContentHeader('COMMERCIAL BREAKDOWN');
  doc.setTextColor(...ORANGE);
  doc.setFontSize(8);
  doc.text('PRODUCT AND PRICING REVIEW', margin, 38);
  doc.setTextColor(...NAVY);
  doc.setFontSize(20);
  doc.text('Estimated landed cost by air and sea', margin, 48);

  autoTable(doc, {
    startY: 56,
    margin: { left: margin, right: margin, top: 34, bottom: 18 },
    head: [['Product', 'Qty', 'Unit price', 'Product cost', 'Weight', 'CBM']],
    body: calculated.lines.map((line) => [
      safe(line.name), number(line.quantity, 0), ngn(line.convertedUnitPriceNgn),
      ngn(line.productCostNgn), `${number(line.calculatedWeightKg)} kg`, number(line.calculatedCbm, 4),
    ]),
    styles: { font: 'helvetica', fontSize: 7.2, textColor: SLATE, cellPadding: 2.6, lineColor: BORDER, lineWidth: 0.2 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.6 },
    columnStyles: { 0: { cellWidth: 55 }, 1: { halign: 'right', cellWidth: 16 }, 2: { halign: 'right', cellWidth: 31 }, 3: { halign: 'right', cellWidth: 35 }, 4: { halign: 'right', cellWidth: 23 }, 5: { halign: 'right', cellWidth: 20 } },
    didDrawPage: (data) => { if (data.pageNumber > 1) addContentHeader('COMMERCIAL BREAKDOWN'); },
  });

  let y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 56) + 6;
  const needed = 92;
  if (y + needed > height - 16) {
    doc.addPage();
    addContentHeader('COMMERCIAL BREAKDOWN');
    y = 38;
  }

  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, 178, 39, 3, 3, 'F');
  const summaryRows: Array<[string, string]> = [
    ['Product cost', ngn(calculated.productCostNgn)],
    ['Domestic transport within China', ngn(calculated.domesticTransportNgn)],
    [`Service charge (${number(input.rates.serviceChargePercent)}%)`, ngn(calculated.serviceChargeNgn)],
    [`VAT (${number(input.rates.vatPercent)}% of service charge)`, ngn(calculated.vatNgn)],
    ['Subtotal before international shipping', ngn(calculated.subtotalBeforeShippingNgn)],
  ];
  summaryRows.forEach(([label, value], index) => {
    const rowY = y + 7 + index * 6.4;
    doc.setFont('helvetica', index === summaryRows.length - 1 ? 'bold' : 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(...SLATE);
    doc.text(label, margin + 5, rowY);
    doc.setTextColor(...NAVY);
    doc.text(value, width - margin - 5, rowY, { align: 'right' });
  });

  y += 46;
  const options = [
    input.includeSea ? { label: 'SEA SHIPPING', metric: `${number(calculated.totalCbm, 4)} CBM`, shipping: calculated.seaShippingNgn, landed: calculated.landedBySeaNgn } : null,
    input.includeAir ? { label: 'AIR SHIPPING', metric: `${number(calculated.totalWeightKg)} kg`, shipping: calculated.airShippingNgn, landed: calculated.landedByAirNgn } : null,
  ].filter(Boolean) as Array<{ label: string; metric: string; shipping: number; landed: number }>;
  const gap = 5;
  const cardW = options.length === 1 ? 178 : (178 - gap) / 2;
  options.forEach((option, index) => {
    const x = margin + index * (cardW + gap);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, cardW, 39, 3, 3, 'S');
    doc.setFillColor(...NAVY);
    doc.roundedRect(x, y, cardW, 11, 3, 3, 'F');
    doc.rect(x, y + 7, cardW, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(option.label, x + 5, y + 7);
    doc.setFontSize(7);
    doc.setTextColor(...SLATE);
    doc.text(`Basis: ${option.metric}`, x + 5, y + 17);
    doc.text(`Inclusive shipping: ${ngn(option.shipping)}`, x + 5, y + 23);
    doc.setDrawColor(...ORANGE);
    doc.line(x + 5, y + 26, x + cardW - 5, y + 26);
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text('ESTIMATED LANDED COST', x + 5, y + 31);
    doc.setFontSize(options.length === 1 ? 15 : 12.5);
    doc.setTextColor(...NAVY);
    doc.text(ngn(option.landed), x + 5, y + 37);
  });

  y += 46;
  doc.setFillColor(255, 247, 241);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin, y + 24);
  doc.rect(margin + 1, y, 177, 24, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...SLATE);
  const note = `Shipping estimates include international freight, customs clearance, applicable duties and handling up to the ${input.rates.deliveryPoint}. Delivery from the Lagos warehouse to the customer's final address is excluded unless separately agreed. Final shipping is reconciled against confirmed packed weight or volume.${input.additionalNotes ? ` ${safe(input.additionalNotes)}` : ''}`;
  doc.text(doc.splitTextToSize(note, 166).slice(0, 5), margin + 6, y + 6);

  const pageCount = doc.getNumberOfPages();
  if (pageCount > input.maxPages) {
    throw new Error(`This quotation needs ${pageCount} pages. Increase the page limit from ${input.maxPages} or reduce the product detail.`);
  }

  for (let page = 2; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('Sure Imports - www.sureimports.com', margin, height - 8);
    doc.text(`${String(page).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`, width - margin, height - 8, { align: 'right' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
