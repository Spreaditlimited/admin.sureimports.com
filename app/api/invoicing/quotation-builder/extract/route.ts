import crypto from 'node:crypto';

import { NextResponse } from 'next/server';

import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { getCloudinary } from '@/lib/cloudinary/config';
import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';
import { extractQuotationFiles } from '@/lib/quotation-builder/openai';
import type { QuotationSourceAsset } from '@/lib/quotation-builder/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const MAX_FILES = 8;
const MAX_FILE_BYTES = 12 * 1024 * 1024;

function safeName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'source';
}

async function uploadSource(file: { name: string; mimeType: string; buffer: Buffer }, index: number): Promise<QuotationSourceAsset> {
  const kind = file.mimeType === 'application/pdf' ? 'pdf' : 'image';
  const publicId = `${Date.now()}-${index + 1}-${crypto.randomBytes(4).toString('hex')}-${safeName(file.name).replace(/\.[^.]+$/, '')}`;
  let upload;
  let previewUrl: string | null = null;

  if (kind === 'pdf') {
    try {
      upload = await uploadBufferToCloudinary(file.buffer, {
        folder: 'admin-sureimports/quotations/sources', publicId,
        resourceType: 'image', overwrite: false, useFilename: false, uniqueFilename: false,
        tags: ['quotation-builder', 'source-pdf'],
      });
      previewUrl = getCloudinary().url(upload.publicId, {
        secure: true,
        resource_type: 'image',
        format: 'jpg',
        page: 1,
        transformation: [{ width: 1400, crop: 'limit', quality: 'auto:good' }],
      });
    } catch {
      upload = await uploadBufferToCloudinary(file.buffer, {
        folder: 'admin-sureimports/quotations/sources', publicId: `${publicId}.pdf`,
        resourceType: 'raw', overwrite: false, useFilename: false, uniqueFilename: false,
        tags: ['quotation-builder', 'source-pdf'],
      });
    }
  } else {
    upload = await uploadBufferToCloudinary(file.buffer, {
      folder: 'admin-sureimports/quotations/sources', publicId,
      resourceType: 'image', overwrite: false, useFilename: false, uniqueFilename: false,
      tags: ['quotation-builder', 'source-image'],
    });
    previewUrl = upload.url;
  }

  return {
    name: file.name,
    mimeType: file.mimeType,
    kind,
    url: upload.url,
    previewUrl,
    publicId: upload.publicId,
    resourceType: upload.resourceType,
    bytes: upload.bytes,
  };
}

export async function POST(request: Request) {
  const access = await requireAdminServiceAccess('invoicing', 'edit');
  if (!access.ok) return access.response;

  try {
    const formData = await request.formData();
    const uploaded = formData.getAll('files').filter((value): value is File => value instanceof File);
    if (!uploaded.length || uploaded.length > MAX_FILES) {
      return NextResponse.json({ statusx: 'INVALID_INPUT', message: `Upload between 1 and ${MAX_FILES} files.` }, { status: 400 });
    }

    const files = await Promise.all(uploaded.map(async (file) => {
      if (!ALLOWED_TYPES.has(file.type)) throw new Error(`${file.name}: unsupported file type.`);
      if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name}: file exceeds 12 MB.`);
      return { name: safeName(file.name), mimeType: file.type, buffer: Buffer.from(await file.arrayBuffer()) };
    }));

    const extraction = await extractQuotationFiles(files);
    const assets = await Promise.all(files.map(uploadSource));
    return NextResponse.json({ statusx: 'SUCCESS', data: { extraction, assets } });
  } catch (error) {
    return NextResponse.json(
      { statusx: 'ERROR', message: error instanceof Error ? error.message : 'Quotation extraction failed.' },
      { status: 500 },
    );
  }
}
