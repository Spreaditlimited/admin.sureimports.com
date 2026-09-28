import { vehicleAdmin } from '@/lib/vehicles/access';
import { vehicleEvent } from '@/lib/vehicles/events';
import { sameOrigin, inputText } from '@/lib/vehicles/http';
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

    const { pidClaim } = await params;
    const body = await request.json().catch(() => ({}));

    const claim = await prisma.invoice_payment_claims.findUnique({
      where: { pidClaim },
      include: { invoice: true },
    });

    if (!claim) return NextResponse.json({ statusx: 'ERROR', message: 'Claim not found' }, { status: 404 });
    if (claim.invoice.linkedRequestId?.startsWith('vehicle:')) {
      sameOrigin(request);
      if (!await vehicleAdmin(true, true)) return unauthorized();
      const reason = inputText(body.reviewNote, 'reason for rejection', 2000);
      await prisma.$transaction(async tx => {
        const vehicleOrderId = claim.invoice.linkedRequestId!.slice(8);
        await tx.$queryRaw`SELECT id FROM vehicle_orders WHERE id = ${vehicleOrderId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM invoices WHERE pidInvoice = ${claim.pidInvoice} FOR UPDATE`;
        const result = await tx.invoice_payment_claims.updateMany({ where: { pidClaim, status: 'PENDING_CONFIRMATION' }, data: { status: 'REJECTED', reviewNote: reason, reviewedByPidUser: admin.pidUser, reviewedAt: new Date() } });
        if (result.count !== 1) throw new Error('This payment was already reviewed.');
        await tx.invoice_audit_logs.create({ data: { pidAuditLog: generatePid('IAL'), pidInvoice: claim.pidInvoice, pidUser: admin.pidUser, action: 'CUSTOMER_PAYMENT_CLAIM_REJECTED', metadata: JSON.stringify({ pidClaim, reason }) } });
        await vehicleEvent(tx, claim.invoice.linkedRequestId!.slice(8), 'PAYMENT_REJECTED', reason, admin.pidUser);
      });
      return NextResponse.json({ statusx: 'SUCCESS' });
    }
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
