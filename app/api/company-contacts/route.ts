import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin, unauthorized } from '../invoicing/_lib/invoicing';

type CompanyContactSettings = {
  id: number;
  pidSetting: string;
  chinaAddress: string;
  chinaContact: string;
  lagosAddress: string;
  lagosContact: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

const defaultSettings = {
  pidSetting: 'COMPANY-CONTACTS-ACTIVE',
  chinaAddress: 'China: 广州市白云区机场路111号建发广场3FB3-1.',
  chinaContact: '+8619576837849',
  lagosAddress: '5 Olutosin Ajayi Street, Ajao Estate, Lagos, Nigeria',
  lagosContact: '+234 803 764 9956, +234 806 458 3664',
};

async function ensureCompanyContactsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS company_contact_settings (
      id INT NOT NULL AUTO_INCREMENT,
      pidSetting VARCHAR(191) NOT NULL,
      chinaAddress LONGTEXT NOT NULL,
      chinaContact VARCHAR(500) NOT NULL,
      lagosAddress LONGTEXT NOT NULL,
      lagosContact VARCHAR(500) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY company_contact_settings_pidSetting_key (pidSetting),
      KEY company_contact_settings_status_idx (status),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);
}

async function getActiveSettings() {
  const rows = await prisma.$queryRaw<CompanyContactSettings[]>`
    SELECT
      id,
      pidSetting,
      chinaAddress,
      chinaContact,
      lagosAddress,
      lagosContact,
      status,
      createdAt,
      updatedAt
    FROM company_contact_settings
    WHERE status = 'ACTIVE'
    ORDER BY id ASC
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    await ensureCompanyContactsTable();
    let settings = await getActiveSettings();

    if (!settings) {
      await prisma.$executeRaw`
        INSERT INTO company_contact_settings (
          pidSetting,
          chinaAddress,
          chinaContact,
          lagosAddress,
          lagosContact,
          status
        ) VALUES (
          ${defaultSettings.pidSetting},
          ${defaultSettings.chinaAddress},
          ${defaultSettings.chinaContact},
          ${defaultSettings.lagosAddress},
          ${defaultSettings.lagosContact},
          'ACTIVE'
        )
      `;
      settings = await getActiveSettings();
    }

    return NextResponse.json({ statusx: 'SUCCESS', data: settings });
  } catch (error: any) {
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: 'Failed to fetch company contacts',
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    await ensureCompanyContactsTable();

    const body = await request.json();
    const chinaAddress = String(body?.chinaAddress || '').trim();
    const chinaContact = String(body?.chinaContact || '').trim();
    const lagosAddress = String(body?.lagosAddress || '').trim();
    const lagosContact = String(body?.lagosContact || '').trim();

    if (!chinaAddress || !chinaContact || !lagosAddress || !lagosContact) {
      return NextResponse.json(
        {
          statusx: 'ERROR',
          message: 'China address, China contact, Lagos address and Lagos contact are required.',
        },
        { status: 400 },
      );
    }

    const existing = await getActiveSettings();

    if (existing) {
      await prisma.$executeRaw`
        UPDATE company_contact_settings
        SET
          chinaAddress = ${chinaAddress},
          chinaContact = ${chinaContact},
          lagosAddress = ${lagosAddress},
          lagosContact = ${lagosContact},
          updatedAt = ${new Date()}
        WHERE pidSetting = ${existing.pidSetting}
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO company_contact_settings (
          pidSetting,
          chinaAddress,
          chinaContact,
          lagosAddress,
          lagosContact,
          status
        ) VALUES (
          ${defaultSettings.pidSetting},
          ${chinaAddress},
          ${chinaContact},
          ${lagosAddress},
          ${lagosContact},
          'ACTIVE'
        )
      `;
    }

    const settings = await getActiveSettings();
    return NextResponse.json({ statusx: 'SUCCESS', data: settings });
  } catch (error: any) {
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: 'Failed to update company contacts',
        error: error.message,
      },
      { status: 500 },
    );
  }
}
