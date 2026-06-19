import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, unauthorized } from '../../_lib/invoicing';
import { quickCreateCustomer } from '@/lib/customers/quickCreateCustomer';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const result = await quickCreateCustomer(await request.json());

    return NextResponse.json(
      {
        statusx: result.status,
        message: result.message,
        data: result.data,
        setupLinkSent: result.setupLinkSent,
      },
      { status: result.status === 'SUCCESS' ? 201 : 200 },
    );
  } catch (error: unknown) {
    const statusCode =
      typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode) || 500
        : 500;
    const message = error instanceof Error ? error.message : 'Failed to create user';

    return NextResponse.json(
      { statusx: 'ERROR', message, error: message },
      { status: statusCode },
    );
  }
}
