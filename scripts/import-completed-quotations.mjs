import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

const sourceRoot = resolve(process.cwd(), '../sureimports.com/deliverables');

const quotations = [
  {
    pidQuotation: 'QTBLEGACY260811TV',
    quotationNumber: 'SI-Q-260811-TV',
    customerName: 'Cafe One',
    customerLocation: 'Nigeria',
    pidUser: 'USR-1780312864600-14DBFG',
    title: 'Tactical & Protective Vests',
    filename: 'Sure-Imports-Tactical-and-Protective-Vests-Quotation-260811.pdf',
    maxPages: 5,
    preparedAt: new Date('2026-08-11T08:25:00+01:00'),
  },
  {
    pidQuotation: 'QTBLEGACY260811ENPKG',
    quotationNumber: 'SI-Q-260811-EN-PKG',
    customerName: 'Eberechi Ndukauba',
    customerLocation: 'Lagos, Nigeria',
    pidUser: 'USR-1786449690665-ICJ3VL',
    title: 'Custom Transparent Side-Gusset Bakery Pouch',
    filename: 'Sure-Imports-Packaging-Pouch-Quotation-Eberechi-Ndukauba.pdf',
    maxPages: 2,
    preparedAt: new Date('2026-08-11T10:10:00+01:00'),
  },
  {
    pidQuotation: 'QTBLEGACY260813BATONS',
    quotationNumber: 'SI-Q-260813-BATONS',
    customerName: 'Cafe One',
    customerLocation: 'Nigeria',
    pidUser: 'USR-1780312864600-14DBFG',
    title: 'Expandable & Security Batons',
    filename: 'Sure-Imports-Expandable-Batons-Quotation-260813.pdf',
    maxPages: 6,
    preparedAt: new Date('2026-08-13T10:03:00+01:00'),
  },
  {
    pidQuotation: 'QTBLEGACY260813KEYM70L',
    quotationNumber: 'SI-Q-260813-KEY-M70L',
    customerName: 'Cafe One',
    customerLocation: 'Nigeria',
    pidUser: 'USR-1780312864600-14DBFG',
    title: 'KEYTON M70L EV Cargo Van — LHD',
    filename: 'Sure-Imports-KEYTON-M70L-EV-Cargo-Van-Quotation.pdf',
    maxPages: 4,
    preparedAt: new Date('2026-08-13T14:56:00+01:00'),
  },
  {
    pidQuotation: 'QTBLEGACY260813RADIOS',
    quotationNumber: 'SI-Q-260813-RADIOS',
    customerName: 'Cafe One',
    customerLocation: 'Nigeria',
    pidUser: 'USR-1780312864600-14DBFG',
    title: 'Talkpod Professional Walkie-Talkies',
    filename: 'Sure-Imports-Talkpod-Walkie-Talkie-Quotation-260813.pdf',
    maxPages: 5,
    preparedAt: new Date('2026-08-13T11:56:00+01:00'),
  },
];

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

cloudinary.config({
  cloud_name: requireEnv('CLOUDINARY_CLOUD_NAME'),
  api_key: requireEnv('CLOUDINARY_API_KEY'),
  api_secret: requireEnv('CLOUDINARY_API_SECRET'),
  secure: true,
});

const prisma = new PrismaClient();

async function uploadPdf(buffer, quotationNumber) {
  return new Promise((resolveUpload, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'admin-sureimports/quotations/generated',
        public_id: `${quotationNumber.toLowerCase()}.pdf`,
        resource_type: 'raw',
        overwrite: true,
        use_filename: true,
        unique_filename: false,
        tags: ['quotation-builder', 'generated-quotation', 'legacy-import'],
      },
      (error, result) => error ? reject(error) : resolveUpload(result),
    );
    stream.end(buffer);
  });
}

try {
  for (const quotation of quotations) {
    const path = resolve(sourceRoot, quotation.filename);
    const [buffer, fileInfo] = await Promise.all([readFile(path), stat(path)]);
    if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error(`${quotation.filename} is not a valid PDF.`);

    const upload = await uploadPdf(buffer, quotation.quotationNumber);
    const record = await prisma.quotation_builder_documents.upsert({
      where: { quotationNumber: quotation.quotationNumber },
      create: {
        pidQuotation: quotation.pidQuotation,
        quotationNumber: quotation.quotationNumber,
        customerName: quotation.customerName,
        customerLocation: quotation.customerLocation,
        pidUser: quotation.pidUser,
        status: 'BUILT',
        sourceFiles: [{ name: quotation.filename, kind: 'completed-quotation-import' }],
        extractedData: { imported: true, importedFrom: 'completed Sure Imports quotation' },
        quoteData: { title: quotation.title, documentType: 'customer-quotation', imported: true },
        rateSnapshot: { imported: true, note: 'Client-facing totals are contained in the approved PDF.' },
        maxPages: quotation.maxPages,
        pdfUrl: upload.secure_url,
        pdfPublicId: upload.public_id,
        pdfBytes: Number(upload.bytes || fileInfo.size),
        createdAt: quotation.preparedAt,
        updatedAt: new Date(),
      },
      update: {
        customerName: quotation.customerName,
        customerLocation: quotation.customerLocation,
        pidUser: quotation.pidUser,
        status: 'BUILT',
        sourceFiles: [{ name: quotation.filename, kind: 'completed-quotation-import' }],
        extractedData: { imported: true, importedFrom: 'completed Sure Imports quotation' },
        quoteData: { title: quotation.title, documentType: 'customer-quotation', imported: true },
        rateSnapshot: { imported: true, note: 'Client-facing totals are contained in the approved PDF.' },
        maxPages: quotation.maxPages,
        pdfUrl: upload.secure_url,
        pdfPublicId: upload.public_id,
        pdfBytes: Number(upload.bytes || fileInfo.size),
        updatedAt: new Date(),
      },
      select: { pidQuotation: true, quotationNumber: true, customerName: true, pdfBytes: true },
    });
    process.stdout.write(`${JSON.stringify(record)}\n`);
  }
} finally {
  await prisma.$disconnect();
}
