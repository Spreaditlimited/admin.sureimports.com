import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureInvoicingCoreTables } from '../../../_lib/invoicing';
import { parseInvoiceLinkedRequestId } from '@/lib/invoiceLinkedService';
import { getUserBusinessName } from '@/lib/userBusinessName';
import { resolveInvoiceCustomerIdentity } from '@/lib/invoicing/invoiceCustomer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessToken: string }> },
) {
  try {
    await ensureInvoicingCoreTables();
    const { accessToken } = await params;

    const token = await prisma.invoice_access_tokens.findUnique({
      where: { accessToken },
      include: {
        invoice: {
          include: {
            items: { orderBy: { lineNo: 'asc' } },
            paymentClaims: { orderBy: { claimedAt: 'desc' } },
            user: {
              select: {
                userFirstname: true,
                userLastname: true,
                userEmail: true,
                userPhone: true,
                phone: true,
                address: true,
                userShippingAddress: true,
                userShippingAddress2: true,
                userState: true,
                userCountry: true,
                country: true,
              },
            },
          },
        },
      },
    });

    if (!token || token.revokedAt || token.expiresAt < new Date()) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invalid or expired invoice link' }, { status: 404 });
    }

    await prisma.invoice_access_tokens.update({
      where: { accessToken },
      data: { lastUsedAt: new Date() },
    });

    const bankAccounts = await prisma.invoice_bank_accounts.findMany({
      where: { status: 'ACTIVE', currency: token.invoice.currency },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        pidBankAccount: true,
        accountName: true,
        accountNumber: true,
        bankName: true,
        sortCode: true,
        currency: true,
        country: true,
        notes: true,
      },
    });

    let invoice = token.invoice as any;
    const link = parseInvoiceLinkedRequestId(invoice?.linkedRequestId);
    if (link.type === 'corporate-gift') {
      const gift = await prisma.corporate_gift_request.findUnique({
        where: { pidRequest: link.id },
        select: {
          businessName: true,
          contactPersonFullName: true,
          contactEmail: true,
        },
      });

      if (gift) {
        invoice = {
          ...invoice,
          customerName: invoice.customerName || gift.businessName || gift.contactPersonFullName,
          customerBusinessName: invoice.customerBusinessName || gift.businessName || null,
          customerContactName: invoice.customerContactName || gift.contactPersonFullName || null,
          customerEmail: invoice.customerEmail || gift.contactEmail || null,
        };
      }
    }

    const userBusinessName = await getUserBusinessName(String(invoice?.pidUser || ''));
    const identity = resolveInvoiceCustomerIdentity(invoice, userBusinessName);
    const profileContactName = `${invoice.user?.userFirstname || ''} ${invoice.user?.userLastname || ''}`.trim();
    const profileAddress = [
      invoice.user?.address || invoice.user?.userShippingAddress,
      invoice.user?.userShippingAddress2,
      invoice.user?.userState,
      invoice.user?.userCountry || invoice.user?.country,
    ].filter(Boolean).join(', ');
    const { notes: _privateAdminNotes, user: _privateUserProfile, ...publicInvoice } = invoice;
    invoice = {
      ...publicInvoice,
      customerName: identity.billedToName,
      customerBusinessName: identity.businessName,
      customerContactName: identity.contactName || profileContactName || null,
      customerEmail: publicInvoice.customerEmail || invoice.user?.userEmail || null,
      customerPhone: publicInvoice.customerPhone || invoice.user?.userPhone || invoice.user?.phone || null,
      customerAddress: publicInvoice.customerAddress || profileAddress || null,
      paymentClaims: (publicInvoice.paymentClaims || []).map((claim: any) => ({
        pidClaim: claim.pidClaim,
        claimedAmount: claim.claimedAmount,
        currency: claim.currency,
        claimedAt: claim.claimedAt,
        status: claim.status,
      })),
    };

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: {
        token: {
          accessToken: token.accessToken,
          expiresAt: token.expiresAt,
          pdfDownloadUrl: `${new URL(request.url).origin}/api/invoicing/public/invoice/${encodeURIComponent(accessToken)}/pdf`,
        },
        invoice,
        bankAccounts,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to load invoice', error: error.message }, { status: 500 });
  }
}
