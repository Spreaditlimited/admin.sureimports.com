import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureInvoicingCoreTables, generatePid, requireAdmin, unauthorized } from '../../../_lib/invoicing';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pidClaim: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();
    await ensureInvoicingCoreTables();

    const { pidClaim } = await params;
    const body = await request.json().catch(() => ({}));

    const claim = await prisma.invoice_payment_claims.findUnique({
      where: { pidClaim },
      include: { invoice: true },
    });

    if (!claim) return NextResponse.json({ statusx: 'ERROR', message: 'Claim not found' }, { status: 404 });
    if (claim.status !== 'PENDING_CONFIRMATION') {
      return NextResponse.json({ statusx: 'ERROR', message: `Claim is already ${claim.status}` }, { status: 400 });
    }

    const updated = await prisma.invoice_payment_claims.update({
      where: { pidClaim },
      data: {
        status: 'REJECTED',
        reviewedByPidUser: admin.pidUser,
        reviewedAt: new Date(),
        reviewNote: body?.reviewNote ? String(body.reviewNote).trim() : null,
      },
    });

    await prisma.invoice_audit_logs.create({
      data: {
        pidAuditLog: generatePid('IAL'),
        pidInvoice: claim.pidInvoice,
        pidUser: admin.pidUser,
        action: 'CUSTOMER_PAYMENT_CLAIM_REJECTED',
        oldStatus: claim.invoice.status,
        newStatus: claim.invoice.status,
        metadata: JSON.stringify({ pidClaim, reviewNote: updated.reviewNote || null }),
      },
    });

    return NextResponse.json({ statusx: 'SUCCESS', data: updated });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to reject claim', error: error.message }, { status: 500 });
  }
}
