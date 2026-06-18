import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { ADMIN_SERVICE_KEY, requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

type ContactInput = {
  pidContact?: string;
  label?: string;
  description?: string;
  phone?: string;
  messageId?: string;
  defaultMessage?: string;
  isActive?: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function ensureWhatsAppContactsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS admin_whatsapp_contacts (
      id INT NOT NULL AUTO_INCREMENT,
      pidContact VARCHAR(191) NOT NULL,
      label VARCHAR(191) NOT NULL,
      description VARCHAR(255) NULL,
      phone VARCHAR(32) NULL,
      messageId VARCHAR(191) NULL,
      defaultMessage LONGTEXT NULL,
      displayOrder INT NOT NULL DEFAULT 0,
      isActive BOOLEAN NOT NULL DEFAULT true,
      createdByPidUser VARCHAR(191) NULL,
      updatedByPidUser VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX admin_whatsapp_contacts_pidContact_key (pidContact),
      INDEX admin_whatsapp_contacts_displayOrder_idx (displayOrder),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS count FROM admin_whatsapp_contacts
  `);

  if (Number(rows[0]?.count || 0) === 0) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO admin_whatsapp_contacts (
        pidContact,
        label,
        description,
        messageId,
        displayOrder,
        isActive,
        createdAt,
        updatedAt
      ) VALUES (
        'WAC-GENERAL',
        'General Enquiries',
        'Sales, sourcing, shipping, and account support',
        'CUR7YKW3K3RBA1',
        0,
        true,
        NOW(3),
        NOW(3)
      )
    `);
  }
}

async function listContacts(includeInactive = true) {
  await ensureWhatsAppContactsTable();

  return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT
      pidContact,
      label,
      description,
      phone,
      messageId,
      defaultMessage,
      displayOrder,
      isActive,
      createdAt,
      updatedAt
    FROM admin_whatsapp_contacts
    ${includeInactive ? Prisma.empty : Prisma.sql`WHERE isActive = true`}
    ORDER BY displayOrder ASC, createdAt ASC
  `);
}

function normalizeContact(input: ContactInput, index: number) {
  const label = String(input.label || '').trim();
  const description = String(input.description || '').trim();
  const phone = String(input.phone || '').replace(/\D/g, '');
  const messageId = String(input.messageId || '').trim();
  const defaultMessage = String(input.defaultMessage || '').trim();
  const pidContact = String(input.pidContact || '').trim() || `WAC-${Date.now()}-${index}`;

  if (!label) {
    throw new Error(`Contact ${index + 1}: label is required.`);
  }

  if (!phone && !messageId) {
    throw new Error(`Contact ${index + 1}: add a WhatsApp phone number or message ID.`);
  }

  if (phone && phone.length < 8) {
    throw new Error(`Contact ${index + 1}: phone number is too short.`);
  }

  return {
    pidContact,
    label,
    description: description || null,
    phone: phone || null,
    messageId: messageId || null,
    defaultMessage: defaultMessage || null,
    displayOrder: index,
    isActive: input.isActive !== false,
  };
}

export async function GET() {
  const access = await requireAdminServiceAccess(ADMIN_SERVICE_KEY, 'view');
  if (!access.ok) return access.response;

  try {
    const contacts = await listContacts(true);
    return NextResponse.json({ statusx: 'SUCCESS', data: contacts });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: 'Failed to load WhatsApp contacts',
        error: getErrorMessage(error, 'Unknown error'),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireAdminServiceAccess(ADMIN_SERVICE_KEY, 'edit');
  if (!access.ok) return access.response;

  try {
    await ensureWhatsAppContactsTable();

    const body = await request.json();
    const rawContacts = Array.isArray(body?.contacts) ? body.contacts : [];
    const contacts = rawContacts.map((contact: ContactInput, index: number) =>
      normalizeContact(contact, index),
    );

    if (contacts.length === 0) {
      return NextResponse.json(
        { statusx: 'ERROR', message: 'Add at least one WhatsApp contact.' },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`DELETE FROM admin_whatsapp_contacts`);

      for (const contact of contacts) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO admin_whatsapp_contacts (
            pidContact,
            label,
            description,
            phone,
            messageId,
            defaultMessage,
            displayOrder,
            isActive,
            createdByPidUser,
            updatedByPidUser,
            createdAt,
            updatedAt
          ) VALUES (
            ${contact.pidContact},
            ${contact.label},
            ${contact.description},
            ${contact.phone},
            ${contact.messageId},
            ${contact.defaultMessage},
            ${contact.displayOrder},
            ${contact.isActive},
            ${access.admin.pidUser},
            ${access.admin.pidUser},
            NOW(3),
            NOW(3)
          )
        `);
      }
    });

    const savedContacts = await listContacts(true);
    return NextResponse.json({ statusx: 'SUCCESS', data: savedContacts });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: getErrorMessage(error, 'Failed to save WhatsApp contacts'),
      },
      { status: 400 },
    );
  }
}
