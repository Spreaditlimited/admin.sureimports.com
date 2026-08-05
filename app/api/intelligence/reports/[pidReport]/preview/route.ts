import { NextResponse } from 'next/server';

import { requireAdmin, unauthorized } from '@/app/api/invoicing/_lib/invoicing';
import { downloadCloudinaryPdf } from '@/lib/cloudinary/download';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ pidReport: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { pidReport } = await context.params;
  const versionId = new URL(request.url).searchParams.get('versionId')?.trim();
  if (!versionId) {
    return NextResponse.json(
      { success: false, error: 'Edition ID is required.' },
      { status: 400 },
    );
  }
  const [report, version] = await Promise.all([
    prisma.intelligence_report_products.findUnique({ where: { pidReport } }),
    prisma.intelligence_report_versions.findFirst({
      where: { pidVersion: versionId, reportId: pidReport },
    }),
  ]);
  if (!report || !version?.pdfPublicId) {
    return NextResponse.json(
      { success: false, error: 'This PDF edition is unavailable.' },
      { status: 404 },
    );
  }
  try {
    const pdf = await downloadCloudinaryPdf(version.pdfPublicId);
    const edition = version.editionLabel
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase();
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${report.slug}-${edition}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unable to preview PDF.',
      },
      { status: 502 },
    );
  }
}
