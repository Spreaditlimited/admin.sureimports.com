import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureInvoicingCoreTables } from '../../../_lib/invoicing';
import { parseInvoiceLinkedRequestId } from '@/lib/invoiceLinkedService';
import { getUserBusinessName } from '@/lib/userBusinessName';

function buildCustomerDisplayName(contactName?: string | null, businessName?: string | null, fallbackName?: string | null) {
  const normalizedContact = String(contactName || '').trim();
  const normalizedBusiness = String(businessName || '').trim();
  const normalizedFallback = String(fallbackName || '').trim();
  const baseName = normalizedContact || normalizedFallback;
  if (!baseName && !normalizedBusiness) return null;
  if (baseName && normalizedBusiness) return `${baseName} (${normalizedBusiness})`;
  return baseName || normalizedBusiness;
}

export async function GET(
  _request: NextRequest,
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
      where: { status: 'ACTIVE' },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
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
          customerName: buildCustomerDisplayName(
            gift.contactPersonFullName,
            gift.businessName,
            invoice.customerName,
          ) || invoice.customerName,
          customerEmail: invoice.customerEmail || gift.contactEmail || null,
        };
      }
    }

    const userBusinessName = await getUserBusinessName(String(invoice?.pidUser || ''));
    if (userBusinessName) {
      const baseName =
        String(invoice?.customerName || '').trim() ||
        String(invoice?.customerEmail || '').trim() ||
        'Customer';
      if (!baseName.includes(`(${userBusinessName})`)) {
        invoice = {
          ...invoice,
          customerName: `${baseName} (${userBusinessName})`,
        };
      }
    }

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: {
        token: {
          accessToken: token.accessToken,
          expiresAt: token.expiresAt,
        },
        invoice,
        bankAccounts,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to load invoice', error: error.message }, { status: 500 });
  }
}
