import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, unauthorized } from '../_lib/invoicing';

async function ensureInvoiceSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS invoice_settings (
      id INT NOT NULL AUTO_INCREMENT,
      pidSetting VARCHAR(191) NOT NULL,
      businessName VARCHAR(191) NOT NULL,
      businessContactDetails LONGTEXT NOT NULL,
      footerNotes LONGTEXT NOT NULL,
      status VARCHAR(191) NULL DEFAULT 'ACTIVE',
      createdByPidUser VARCHAR(191) NULL,
      updatedByPidUser VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      UNIQUE INDEX invoice_settings_pidSetting_key (pidSetting),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();
    await ensureInvoiceSettingsTable();

    const settings = await prisma.invoice_settings.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ statusx: 'SUCCESS', data: settings });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to fetch invoice settings', error: error.message },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();
    await ensureInvoiceSettingsTable();

    const body = await request.json();
    const businessName = String(body?.businessName ?? '').trim();
    const businessContactDetails = String(body?.businessContactDetails ?? '').trim();
    const footerNotes = String(body?.footerNotes ?? '');

    if (!businessName || !businessContactDetails) {
      return NextResponse.json(
        { statusx: 'ERROR', message: 'businessName and businessContactDetails are required' },
        { status: 400 },
      );
    }
    if (businessName.length > 191) {
      return NextResponse.json(
        { statusx: 'ERROR', message: 'Business name is too long. Maximum length is 191 characters.' },
        { status: 400 },
      );
    }

    const existing = await prisma.invoice_settings.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    let settings;
    if (existing) {
      settings = await prisma.invoice_settings.update({
        where: { pidSetting: existing.pidSetting },
        data: {
          businessName,
          businessContactDetails,
          footerNotes,
          updatedByPidUser: admin.pidUser,
        },
      });
    } else {
      settings = await prisma.invoice_settings.create({
        data: {
          pidSetting: `INV-SETTINGS-${Date.now()}`,
          businessName,
          businessContactDetails,
          footerNotes,
          status: 'ACTIVE',
          createdByPidUser: admin.pidUser,
          updatedByPidUser: admin.pidUser,
        },
      });
    }

    return NextResponse.json({ statusx: 'SUCCESS', data: settings });
  } catch (error: any) {
    if (error?.code === 'P2000') {
      return NextResponse.json(
        {
          statusx: 'ERROR',
          message: 'A value is too long for one of the fields. Keep business name shorter and try again.',
          error: error.message,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to update invoice settings', error: error.message },
      { status: 500 },
    );
  }
}
