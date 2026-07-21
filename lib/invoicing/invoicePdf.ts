import { jsPDF } from 'jspdf';
import autoTableImport from 'jspdf-autotable';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type InvoicePdfItem = {
  lineNo?: number | null;
  description: string;
  quantity: MoneyValue;
  unitPrice: MoneyValue;
  lineTotal: MoneyValue;
};

type MoneyValue = string | number | { toString(): string };

export type InvoicePdfBankAccount = {
  accountName: string;
  accountNumber: string;
  bankName: string;
  sortCode?: string | null;
  currency: string;
  country?: string | null;
  notes?: string | null;
};

export type InvoicePdfData = {
  invoiceNumber: string;
  status: string;
  currency: string;
  subtotal: MoneyValue;
  discountTotal: MoneyValue;
  taxTotal: MoneyValue;
  grandTotal: MoneyValue;
  amountPaid: MoneyValue;
  balanceDue: MoneyValue;
  issuedAt?: string | Date | null;
  dueAt?: string | Date | null;
  headerSnapshot?: string | null;
  footerSnapshot?: string | null;
  customerNotes?: string | null;
  customerBusinessName?: string | null;
  customerContactName?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  items: InvoicePdfItem[];
};

const NAVY: [number, number, number] = [11, 59, 136];
const DEEP_NAVY: [number, number, number] = [7, 31, 70];
const ORANGE: [number, number, number] = [242, 113, 28];
const SLATE: [number, number, number] = [71, 85, 105];
const LIGHT: [number, number, number] = [241, 245, 249];
const BORDER: [number, number, number] = [203, 213, 225];
const autoTable = (
  typeof autoTableImport === 'function'
    ? autoTableImport
    : (autoTableImport as unknown as { default: typeof autoTableImport }).default
);
let whiteLogoDataUrl: string | null | undefined;
let cjkFontBase64: string | null | undefined;

function getWhiteLogoDataUrl() {
  if (whiteLogoDataUrl !== undefined) return whiteLogoDataUrl;
  try {
    const logo = readFileSync(join(process.cwd(), 'public/assets/images/logo-white.png'));
    whiteLogoDataUrl = `data:image/png;base64,${logo.toString('base64')}`;
  } catch {
    whiteLogoDataUrl = null;
  }
  return whiteLogoDataUrl;
}

function getCjkFontBase64() {
  if (cjkFontBase64 !== undefined) return cjkFontBase64;
  try {
    cjkFontBase64 = readFileSync(
      join(process.cwd(), 'public/assets/fonts/NotoSansSC-InvoiceSubset.ttf'),
    ).toString('base64');
  } catch {
    cjkFontBase64 = null;
  }
  return cjkFontBase64;
}

function registerCjkFont(doc: jsPDF) {
  const font = getCjkFontBase64();
  if (!font) return false;
  doc.addFileToVFS('NotoSansSC-InvoiceSubset.ttf', font);
  doc.addFont('NotoSansSC-InvoiceSubset.ttf', 'NotoSansSCInvoice', 'normal');
  return true;
}

function normalizePunctuation(value: unknown) {
  return String(value || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/₦/g, 'NGN ');
}

function pdfSafeText(value: unknown) {
  return normalizePunctuation(value)
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

type IssuerSection = { title: string; lines: string[] };

function parseIssuerDetails(lines: string[]) {
  const offices: IssuerSection[] = [];
  const contacts: IssuerSection[] = [];
  let current: IssuerSection | null = null;

  lines.forEach((line) => {
    if (/office\s*:?[\s]*$/i.test(line)) {
      current = { title: line.replace(/\s*:?[\s]*$/, ''), lines: [] };
      offices.push(current);
      return;
    }
    if (/^(email|website|phone)\s*:?[\s]*$/i.test(line)) {
      current = { title: line.replace(/\s*:?[\s]*$/, ''), lines: [] };
      contacts.push(current);
      return;
    }
    if (!current) {
      current = { title: 'Company details', lines: [] };
      contacts.push(current);
    }
    current.lines.push(line);
  });

  return {
    offices: offices.filter((section) => section.lines.length > 0),
    contacts: contacts.filter((section) => section.lines.length > 0),
  };
}

function containsCjk(value: string) {
  return /[\u3400-\u9FFF]/.test(value);
}

function money(currency: string, value: MoneyValue) {
  return `${currency} ${Number(value || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function date(value?: string | Date | null) {
  if (!value) return 'Not specified';
  return new Date(value).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function clean(value?: string | null) {
  return pdfSafeText(value);
}

export function invoicePdfFilename(invoiceNumber: string) {
  const safeNumber = String(invoiceNumber || 'invoice').replace(/[^a-z0-9._-]+/gi, '-');
  return `Sure-Imports-Invoice-${safeNumber}.pdf`;
}

export function createInvoicePdf(invoice: InvoicePdfData, bankAccounts: InvoicePdfBankAccount[]) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  const cjkFontReady = registerCjkFont(doc);
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = width - margin * 2;
  const businessHeader = String(invoice.headerSnapshot || '')
    .split('\n')
    .map((line) => normalizePunctuation(line).trim())
    .filter(Boolean);
  const issuerName = businessHeader.shift() || 'Sure Imports Limited';
  const issuerDetails = parseIssuerDetails(businessHeader);
  const billedTo = clean(invoice.customerBusinessName) || clean(invoice.customerContactName) || clean(invoice.customerName) || 'Customer';
  const contactName = clean(invoice.customerContactName) || (!invoice.customerBusinessName ? clean(invoice.customerName) : '');

  const addPageHeader = () => {
    doc.setFillColor(...DEEP_NAVY);
    doc.rect(0, 0, width, 38, 'F');
    doc.setFillColor(...ORANGE);
    doc.rect(0, 0, width, 2.2, 'F');
    doc.rect(margin, 32.5, 24, 1, 'F');
    doc.setTextColor(255, 255, 255);
    const logo = getWhiteLogoDataUrl();
    if (logo) {
      doc.addImage(logo, 'PNG', margin, 12, 62, 9.9, undefined, 'FAST');
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(pdfSafeText(issuerName), margin, 19);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text('INVOICE', width - margin, 15.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text('OFFICIAL BILLING DOCUMENT', width - margin, 21, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(pdfSafeText(invoice.invoiceNumber), width - margin, 28, { align: 'right' });
  };

  const ensureSpace = (y: number, required: number) => {
    if (y + required <= height - 18) return y;
    doc.addPage();
    addPageHeader();
    return 47;
  };

  addPageHeader();
  let y = 46;

  if (issuerDetails.offices.length || issuerDetails.contacts.length) {
    const innerX = margin + 7;
    const innerWidth = contentWidth - 12;
    const officeColumns = Math.max(1, Math.min(issuerDetails.offices.length, 3));
    const officeColumnWidth = innerWidth / officeColumns;
    const officeWrapped = issuerDetails.offices.map((office) => ({
      ...office,
      usesCjk: cjkFontReady && office.lines.some(containsCjk),
      wrappedLines: office.lines.flatMap((line) => {
        const useCjk = cjkFontReady && containsCjk(line);
        doc.setFont(useCjk ? 'NotoSansSCInvoice' : 'helvetica', 'normal');
        doc.setFontSize(7.5);
        return doc.splitTextToSize(useCjk ? line : pdfSafeText(line), officeColumnWidth - 8);
      }),
    }));
    const officeRowHeight = officeWrapped.length
      ? 9 + Math.max(...officeWrapped.map((office) => office.wrappedLines.length)) * 3.6
      : 0;
    const contactColumns = Math.max(1, Math.min(issuerDetails.contacts.length, 3));
    const contactColumnWidth = innerWidth / contactColumns;
    const contactWrapped = issuerDetails.contacts.map((contact) => ({
      ...contact,
      wrappedLines: contact.lines.flatMap((line) => doc.splitTextToSize(line, contactColumnWidth - 8)),
    }));
    const contactRowHeight = contactWrapped.length
      ? 9 + Math.max(...contactWrapped.map((contact) => contact.wrappedLines.length)) * 3.6
      : 0;
    const issuerBoxHeight = 13 + officeRowHeight + (officeRowHeight && contactRowHeight ? 5 : 0) + contactRowHeight + 5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(margin, y, contentWidth, issuerBoxHeight, 2, 2, 'FD');
    doc.setFillColor(...ORANGE);
    doc.roundedRect(margin, y, 2.2, issuerBoxHeight, 1, 1, 'F');
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('ISSUED BY', innerX, y + 7);

    let sectionY = y + 13;
    officeWrapped.forEach((office, index) => {
      const column = index % officeColumns;
      const x = innerX + column * officeColumnWidth;
      if (column > 0) {
        doc.setDrawColor(...BORDER);
        doc.line(x - 4, sectionY - 4, x - 4, sectionY + officeRowHeight - 4);
      }
      doc.setTextColor(...NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.text(office.title.toUpperCase(), x, sectionY);
      doc.setTextColor(...SLATE);
      doc.setFont(office.usesCjk ? 'NotoSansSCInvoice' : 'helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(office.wrappedLines, x, sectionY + 5);
    });
    sectionY += officeRowHeight;

    if (officeRowHeight && contactRowHeight) {
      doc.setDrawColor(...BORDER);
      doc.line(innerX, sectionY, margin + contentWidth - 5, sectionY);
      sectionY += 5;
    }

    contactWrapped.forEach((contact, index) => {
      const column = index % contactColumns;
      const x = innerX + column * contactColumnWidth;
      if (column > 0) {
        doc.setDrawColor(...BORDER);
        doc.line(x - 4, sectionY - 4, x - 4, sectionY + contactRowHeight - 4);
      }
      doc.setTextColor(...NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(contact.title.toUpperCase(), x, sectionY);
      doc.setTextColor(...SLATE);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(contact.wrappedLines, x, sectionY + 5);
    });
    y += issuerBoxHeight + 7;
  }

  const addressLines = invoice.customerAddress
    ? doc.splitTextToSize(clean(invoice.customerAddress), 100)
    : [];
  const customerDetailLines =
    (invoice.customerBusinessName && contactName ? 1 : 0) +
    addressLines.length +
    (invoice.customerPhone ? 1 : 0) +
    (invoice.customerEmail ? 1 : 0);
  const billingHeight = Math.max(43, 22 + customerDetailLines * 4.2);

  doc.setDrawColor(...BORDER);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, 112, billingHeight, 2, 2, 'FD');
  doc.setFillColor(...ORANGE);
  doc.roundedRect(margin, y, 2.2, billingHeight, 1, 1, 'F');
  doc.setTextColor(...SLATE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BILL TO', margin + 5, y + 7);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text(doc.splitTextToSize(billedTo, 100), margin + 5, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  let customerY = y + 21;
  if (invoice.customerBusinessName && contactName) {
    doc.text(`Contact person: ${contactName}`, margin + 5, customerY);
    customerY += 5;
  }
  if (addressLines.length) {
    doc.text(addressLines, margin + 5, customerY);
    customerY += addressLines.length * 4;
  }
  if (invoice.customerPhone) {
    doc.text(`Phone: ${clean(invoice.customerPhone)}`, margin + 5, customerY);
    customerY += 4;
  }
  if (invoice.customerEmail) {
    doc.text(`Email: ${clean(invoice.customerEmail)}`, margin + 5, customerY);
  }

  const metaX = margin + 119;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(metaX, y, contentWidth - 119, billingHeight, 2, 2, 'FD');
  const metaRows = [
    ['Status', invoice.status.replace(/_/g, ' ')],
    ['Issue date', date(invoice.issuedAt)],
    ['Due date', date(invoice.dueAt)],
    ['Currency', invoice.currency],
  ];
  const metaStartY = y + Math.max(8, (billingHeight - 27) / 2);
  metaRows.forEach(([label, value], index) => {
    const rowY = metaStartY + index * 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE);
    doc.setFontSize(8);
    doc.text(label, metaX + 5, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafeText(value), width - margin - 5, rowY, { align: 'right' });
  });
  y += billingHeight + 7;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, top: 47, bottom: 20 },
    head: [['#', 'Description', 'Qty', 'Unit price', 'Amount']],
    body: invoice.items.map((item, index) => [
      item.lineNo || index + 1,
      pdfSafeText(item.description),
      Number(item.quantity).toLocaleString('en-NG'),
      money(invoice.currency, item.unitPrice),
      money(invoice.currency, item.lineTotal),
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3.2, lineColor: BORDER, lineWidth: 0.15 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 17, halign: 'right' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (hook) => {
      if (hook.pageNumber > 1) addPageHeader();
    },
  });

  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 7;
  y = ensureSpace(y, 54);

  const totalsX = width - margin - 76;
  const totals = [
    ['Subtotal', money(invoice.currency, invoice.subtotal)],
    ['Discount', `- ${money(invoice.currency, invoice.discountTotal)}`],
    ['Tax', money(invoice.currency, invoice.taxTotal)],
    ['Grand total', money(invoice.currency, invoice.grandTotal)],
    ['Amount paid', money(invoice.currency, invoice.amountPaid)],
  ];
  totals.forEach(([label, value], index) => {
    const rowY = y + index * 6;
    doc.setFont('helvetica', index === 3 ? 'bold' : 'normal');
    doc.setTextColor(...SLATE);
    doc.setFontSize(index === 3 ? 9 : 8.5);
    doc.text(label, totalsX, rowY);
    doc.setTextColor(15, 23, 42);
    doc.text(value, width - margin, rowY, { align: 'right' });
  });
  const balanceY = y + totals.length * 6 + 2;
  doc.setFillColor(...NAVY);
  doc.roundedRect(totalsX - 4, balanceY - 5, 80, 13, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('BALANCE DUE', totalsX, balanceY + 2.5);
  doc.text(money(invoice.currency, invoice.balanceDue), width - margin - 4, balanceY + 2.5, { align: 'right' });
  y = balanceY + 16;

  if (bankAccounts.length) {
    y = ensureSpace(y, 28);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PAYMENT / BANK DETAILS', margin, y);
    y += 5;
    bankAccounts.forEach((account) => {
      const noteLines = account.notes ? doc.splitTextToSize(pdfSafeText(account.notes), contentWidth - 10) : [];
      const boxHeight = 18 + noteLines.length * 4;
      y = ensureSpace(y, boxHeight + 4);
      doc.setFillColor(...LIGHT);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${pdfSafeText(account.bankName)} - ${pdfSafeText(account.accountName)}`, margin + 5, y + 7);
      doc.setFontSize(12);
      doc.text(pdfSafeText(account.accountNumber), margin + 5, y + 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const accountMeta = [account.currency, account.sortCode ? `Sort code: ${account.sortCode}` : '', account.country || ''].filter(Boolean).join('  |  ');
      doc.text(accountMeta, width - margin - 5, y + 8, { align: 'right' });
      if (noteLines.length) doc.text(noteLines, margin + 5, y + 19);
      y += boxHeight + 4;
    });
  }

  const noteSections = [
    ['NOTES', clean(invoice.customerNotes)],
    ['TERMS & PAYMENT INSTRUCTIONS', clean(invoice.footerSnapshot)],
  ].filter((entry) => entry[1]);

  noteSections.forEach(([title, body]) => {
    if (title === 'TERMS & PAYMENT INSTRUCTIONS') y += 6;
    const lines = doc.splitTextToSize(pdfSafeText(body), contentWidth - 10);
    y = ensureSpace(y, 12 + lines.length * 4);
    doc.setTextColor(...NAVY);
  doc.setFontSize(9);
    doc.text(title, margin, y);
    doc.setTextColor(...SLATE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(lines, margin, y + 5);
    y += 10 + lines.length * 4;
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...BORDER);
    doc.line(margin, height - 13, width - margin, height - 13);
    doc.setTextColor(...SLATE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Thank you for choosing Sure Imports.', margin, height - 8);
    doc.text(`Page ${page} of ${pageCount}`, width - margin, height - 8, { align: 'right' });
  }

  return doc;
}

export function createInvoicePdfBuffer(invoice: InvoicePdfData, bankAccounts: InvoicePdfBankAccount[]) {
  const arrayBuffer = createInvoicePdf(invoice, bankAccounts).output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
