import crypto from 'node:crypto';

import { NextResponse } from 'next/server';
import sharp from 'sharp';

import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';
import { prisma } from '@/lib/prisma';
import { calculateQuote } from '@/lib/quotation-builder/calculations';
import { createQuotationPdf, type QuotePdfImage } from '@/lib/quotation-builder/pdf';
import type { QuoteBuildInput, QuotationSourceAsset } from '@/lib/quotation-builder/types';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function clean(value: unknown, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function finite(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function quotationId() {
  return `QTB${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

function quotationNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `SI-Q-${date}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function safeCloudinaryImageUrl(value: unknown) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && url.pathname.includes('/image/upload/')
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

async function pdfImage(asset: QuotationSourceAsset): Promise<QuotePdfImage | null> {
  const url = safeCloudinaryImageUrl(asset.previewUrl || asset.url);
  if (!url) return null;
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  if (!response.ok) return null;
  const input = Buffer.from(await response.arrayBuffer());
  if (input.length > 15 * 1024 * 1024) return null;
  const converted = await sharp(input).rotate().flatten({ background: '#ffffff' }).resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer({ resolveWithObject: true });
  return {
    dataUrl: `data:image/jpeg;base64,${converted.data.toString('base64')}`,
    format: 'JPEG',
    width: converted.info.width,
    height: converted.info.height,
  };
}

function validateInput(body: any): QuoteBuildInput {
  const input = body as QuoteBuildInput;
  input.customerName = clean(input.customerName, 220);
  input.customerLocation = clean(input.customerLocation, 255);
  input.title = clean(input.title, 240);
  input.introduction = clean(input.introduction, 1200);
  input.additionalNotes = clean(input.additionalNotes, 1500);
  input.maxPages = Math.max(2, Math.min(8, Math.round(finite(input.maxPages, 2))));
  input.includeAir = Boolean(input.includeAir);
  input.includeSea = Boolean(input.includeSea);
  if (!input.customerName) throw new Error('Customer name is required.');
  if (!input.title) throw new Error('Quotation title is required.');
  if (!input.includeAir && !input.includeSea) throw new Error('Select air shipping, sea shipping, or both.');
  if (!Array.isArray(input.products) || input.products.length < 1 || input.products.length > 50) throw new Error('A quotation must contain between 1 and 50 products.');
  if (!Array.isArray(input.sourceAssets)) input.sourceAssets = [];
  input.products = input.products.map((product, index) => ({
    ...product,
    id: clean(product.id, 80) || `product-${index + 1}`,
    name: clean(product.name, 300),
    description: clean(product.description, 2000),
    notes: clean(product.notes, 1200),
    unitPrice: Math.max(0, finite(product.unitPrice)),
    quantity: Math.max(0, finite(product.quantity)),
    domesticTransportCost: Math.max(0, finite(product.domesticTransportCost)),
  }));
  if (input.products.some((product) => !product.name || product.quantity <= 0)) throw new Error('Every product needs a name and a quantity greater than zero.');

  const rateKeys = ['ngnPerUsd', 'ngnPerCny', 'cnyPerUsd', 'airRateUsdPerKg', 'seaRateNgnPerCbm'] as const;
  rateKeys.forEach((key) => {
    input.rates[key] = finite(input.rates?.[key]);
    if (input.rates[key] <= 0) throw new Error(`${key} must be greater than zero.`);
  });
  input.rates.serviceChargePercent = Math.max(0, finite(input.rates.serviceChargePercent));
  input.rates.vatPercent = Math.max(0, finite(input.rates.vatPercent));
  input.rates.destinationCountry = clean(input.rates.destinationCountry, 100) || 'Nigeria';
  input.rates.deliveryPoint = clean(input.rates.deliveryPoint, 200) || 'Sure Imports Lagos warehouse';
  input.rates.airPlanId = clean(input.rates.airPlanId, 80);
  input.rates.airPlanName = clean(input.rates.airPlanName, 100);
  return input;
}

export async function GET() {
  const access = await requireAdminServiceAccess('invoicing', 'view');
  if (!access.ok) return access.response;
  const records = await prisma.quotation_builder_documents.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      pidQuotation: true,
      quotationNumber: true,
      customerName: true,
      customerLocation: true,
      pidUser: true,
      linkedRequestId: true,
      status: true,
      maxPages: true,
      pdfBytes: true,
      createdAt: true,
      updatedAt: true,
      lastSentAt: true,
      sendCount: true,
      invoices: {
        select: {
          pidInvoice: true,
          invoiceNumber: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  const pidUsers = Array.from(new Set(records.map((record) => record.pidUser).filter(Boolean))) as string[];
  const users = pidUsers.length ? await prisma.users.findMany({
    where: { pidUser: { in: pidUsers } },
    select: { pidUser: true, userFirstname: true, userLastname: true, userEmail: true },
  }) : [];
  const userMap = new Map(users.map((user) => [user.pidUser, user]));
  return NextResponse.json({ statusx: 'SUCCESS', data: records.map((record) => ({ ...record, user: record.pidUser ? userMap.get(record.pidUser) || null : null })) });
}

export async function POST(request: Request) {
  const access = await requireAdminServiceAccess('invoicing', 'edit');
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const input = validateInput(body);
    const pidUser = clean(body.pidUser, 191);
    const linkedRequestId = clean(body.linkedRequestId, 191) || null;
    if (!pidUser) throw new Error('Select a customer account before building the quotation.');
    const customer = await prisma.users.findUnique({ where: { pidUser } });
    if (!customer) throw new Error('The selected customer account could not be found.');
    if (linkedRequestId) {
      const sourcingRequest = await prisma.corporate_gift_request.findUnique({
        where: { pidRequest: linkedRequestId },
        select: { pidRequest: true, contactEmail: true },
      });
      if (!sourcingRequest) throw new Error('The linked corporate sourcing request could not be found.');
      const accountEmails = [customer.userEmail, customer.email].map((value) => String(value || '').trim().toLowerCase());
      if (!accountEmails.includes(String(sourcingRequest.contactEmail || '').trim().toLowerCase())) {
        throw new Error('The selected customer account does not match the corporate sourcing request.');
      }
    }
    const calculated = calculateQuote(input);
    const pidQuotation = quotationId();
    const quoteNumber = quotationNumber();
    const images = (await Promise.all(input.sourceAssets.map(pdfImage))).filter(Boolean) as QuotePdfImage[];
    const pdf = createQuotationPdf(input, calculated, quoteNumber, new Date(), images);
    const upload = await uploadBufferToCloudinary(pdf, {
      folder: 'admin-sureimports/quotations/generated',
      publicId: `${quoteNumber.toLowerCase()}.pdf`,
      resourceType: 'raw', overwrite: false, useFilename: true, uniqueFilename: false,
      tags: ['quotation-builder', 'generated-quotation'],
    });

    const record = await prisma.quotation_builder_documents.create({
      data: {
        pidQuotation,
        quotationNumber: quoteNumber,
        customerName: input.customerName,
        customerLocation: input.customerLocation || null,
        pidUser,
        linkedRequestId,
        status: 'BUILT',
        sourceFiles: input.sourceAssets as any,
        extractedData: body.extractedData || undefined,
        quoteData: { ...input, calculated } as any,
        rateSnapshot: input.rates as any,
        maxPages: input.maxPages,
        pdfUrl: upload.url,
        pdfPublicId: upload.publicId,
        pdfBytes: pdf.length,
        createdByPidUser: access.admin.pidUser,
        updatedByPidUser: access.admin.pidUser,
      },
    });
    return NextResponse.json({
      statusx: 'SUCCESS',
      data: {
        pidQuotation: record.pidQuotation,
        quotationNumber: record.quotationNumber,
        pdfUrl: `/api/invoicing/quotation-builder/${encodeURIComponent(record.pidQuotation)}/pdf`,
        calculated,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { statusx: 'ERROR', message: error instanceof Error ? error.message : 'Could not build quotation.' },
      { status: 500 },
    );
  }
}
