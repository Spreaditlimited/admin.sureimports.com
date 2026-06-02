import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export const INVOICE_STATUSES = [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['ISSUED', 'CANCELLED'],
  ISSUED: ['PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
  PARTIALLY_PAID: ['PAID', 'OVERDUE', 'CANCELLED'],
  PAID: [],
  OVERDUE: ['PARTIALLY_PAID', 'PAID', 'CANCELLED'],
  CANCELLED: [],
};

export function canTransitionStatus(from: string, to: string): boolean {
  if (!INVOICE_STATUSES.includes(from as InvoiceStatus)) return false;
  if (!INVOICE_STATUSES.includes(to as InvoiceStatus)) return false;
  return STATUS_TRANSITIONS[from as InvoiceStatus].includes(to as InvoiceStatus);
}

export function nowIsoCompact() {
  const d = new Date();
  const y = d.getUTCFullYear().toString();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function generatePid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function generateAccessToken() {
  return `ivk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

export function toMoneyInput(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error('Invalid monetary value');
  }
  return num.toFixed(2);
}

export function unauthorized() {
  return NextResponse.json({ statusx: 'ERROR', message: 'Unauthorized' }, { status: 401 });
}

export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  const payload = verifyToken(token) as { pidUser?: string } | null;
  if (!payload?.pidUser) return null;

  const admin = await prisma.admin.findUnique({
    where: { pidUser: payload.pidUser },
    select: {
      pidUser: true,
      userEmail: true,
      userFirstname: true,
      userStatus: true,
    },
  });

  return admin;
}

export function isSuperAdmin(userStatus?: string | null) {
  return userStatus === 'superadmin' || userStatus === 'L1';
}

export async function getSuperAdminPidUsers() {
  const users = await prisma.admin.findMany({
    where: {
      OR: [{ userStatus: 'superadmin' }, { userStatus: 'L1' }],
    },
    select: { pidUser: true },
  });
  return users.map((user) => user.pidUser);
}

export async function canAdminAccessInvoiceCreatedBy(
  admin: { userStatus?: string | null },
  createdByPidUser?: string | null,
) {
  if (isSuperAdmin(admin.userStatus)) return true;
  if (!createdByPidUser) return true;

  const superAdminPidUsers = await getSuperAdminPidUsers();
  return !superAdminPidUsers.includes(createdByPidUser);
}

export async function createUniqueInvoiceNumber(): Promise<string> {
  let attempts = 0;
  while (attempts < 5) {
    const invoiceNumber = `INV-${nowIsoCompact()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await prisma.invoices.findUnique({ where: { invoiceNumber } });
    if (!exists) return invoiceNumber;
    attempts += 1;
  }
  throw new Error('Could not generate unique invoice number');
}

export async function createUniqueReceiptNumber(): Promise<string> {
  let attempts = 0;
  while (attempts < 5) {
    const receiptNumber = `RCT-${nowIsoCompact()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await prisma.receipts.findUnique({ where: { receiptNumber } });
    if (!exists) return receiptNumber;
    attempts += 1;
  }
  throw new Error('Could not generate unique receipt number');
}

export async function writeAuditLog(params: {
  pidInvoice: string;
  pidUser?: string | null;
  action: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  metadata?: string | null;
}) {
  await prisma.invoice_audit_logs.create({
    data: {
      pidAuditLog: generatePid('IAL'),
      pidInvoice: params.pidInvoice,
      pidUser: params.pidUser || null,
      action: params.action,
      oldStatus: params.oldStatus || null,
      newStatus: params.newStatus || null,
      metadata: params.metadata || null,
    },
  });
}

export function derivePaymentStatus(amountPaid: number, grandTotal: number): InvoiceStatus {
  if (amountPaid <= 0) return 'ISSUED';
  if (amountPaid >= grandTotal) return 'PAID';
  return 'PARTIALLY_PAID';
}

export async function ensureInvoicingCoreTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INT NOT NULL AUTO_INCREMENT,
      pidInvoice VARCHAR(191) NOT NULL,
      invoiceNumber VARCHAR(191) NOT NULL,
      pidUser VARCHAR(191) NOT NULL,
      customerName VARCHAR(191) NULL,
      customerEmail VARCHAR(191) NULL,
      customerPhone VARCHAR(191) NULL,
      currency VARCHAR(191) NOT NULL DEFAULT 'NGN',
      subtotal DECIMAL(18,2) NOT NULL,
      discountTotal DECIMAL(18,2) NOT NULL DEFAULT 0,
      taxTotal DECIMAL(18,2) NOT NULL DEFAULT 0,
      grandTotal DECIMAL(18,2) NOT NULL,
      amountPaid DECIMAL(18,2) NOT NULL DEFAULT 0,
      balanceDue DECIMAL(18,2) NOT NULL,
      status VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
      issuedAt DATETIME(3) NULL,
      dueAt DATETIME(3) NULL,
      paidAt DATETIME(3) NULL,
      headerSnapshot LONGTEXT NULL,
      footerSnapshot LONGTEXT NULL,
      notes LONGTEXT NULL,
      linkedRequestId VARCHAR(191) NULL,
      createdByPidUser VARCHAR(191) NULL,
      updatedByPidUser VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      UNIQUE INDEX invoices_pidInvoice_key (pidInvoice),
      UNIQUE INDEX invoices_invoiceNumber_key (invoiceNumber),
      INDEX invoices_pidUser_idx (pidUser),
      INDEX invoices_status_idx (status),
      INDEX invoices_createdAt_idx (createdAt),
      INDEX invoices_dueAt_idx (dueAt),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INT NOT NULL AUTO_INCREMENT,
      pidInvoiceItem VARCHAR(191) NOT NULL,
      pidInvoice VARCHAR(191) NOT NULL,
      lineNo INT NOT NULL,
      description LONGTEXT NOT NULL,
      quantity DECIMAL(18,2) NOT NULL,
      unitPrice DECIMAL(18,2) NOT NULL,
      lineTotal DECIMAL(18,2) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      UNIQUE INDEX invoice_items_pidInvoiceItem_key (pidInvoiceItem),
      INDEX invoice_items_pidInvoice_idx (pidInvoice),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS invoice_payments (
      id INT NOT NULL AUTO_INCREMENT,
      pidInvoicePayment VARCHAR(191) NOT NULL,
      pidInvoice VARCHAR(191) NOT NULL,
      pidUser VARCHAR(191) NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      currency VARCHAR(191) NOT NULL DEFAULT 'NGN',
      paymentMethod VARCHAR(191) NOT NULL,
      reference VARCHAR(191) NULL,
      note LONGTEXT NULL,
      paidAt DATETIME(3) NOT NULL,
      recordedByPidUser VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      UNIQUE INDEX invoice_payments_pidInvoicePayment_key (pidInvoicePayment),
      INDEX invoice_payments_pidInvoice_idx (pidInvoice),
      INDEX invoice_payments_pidUser_idx (pidUser),
      INDEX invoice_payments_paidAt_idx (paidAt),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INT NOT NULL AUTO_INCREMENT,
      pidReceipt VARCHAR(191) NOT NULL,
      receiptNumber VARCHAR(191) NOT NULL,
      pidInvoice VARCHAR(191) NOT NULL,
      pidInvoicePayment VARCHAR(191) NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      balanceAfter DECIMAL(18,2) NOT NULL,
      issuedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      deliveryStatus VARCHAR(191) NOT NULL DEFAULT 'PENDING',
      sentAt DATETIME(3) NULL,
      createdByPidUser VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      UNIQUE INDEX receipts_pidReceipt_key (pidReceipt),
      UNIQUE INDEX receipts_receiptNumber_key (receiptNumber),
      INDEX receipts_pidInvoice_idx (pidInvoice),
      INDEX receipts_pidInvoicePayment_idx (pidInvoicePayment),
      INDEX receipts_issuedAt_idx (issuedAt),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS invoice_access_tokens (
      id INT NOT NULL AUTO_INCREMENT,
      pidToken VARCHAR(191) NOT NULL,
      pidInvoice VARCHAR(191) NOT NULL,
      accessToken VARCHAR(191) NOT NULL,
      expiresAt DATETIME(3) NOT NULL,
      lastUsedAt DATETIME(3) NULL,
      revokedAt DATETIME(3) NULL,
      createdByPidUser VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      UNIQUE INDEX invoice_access_tokens_pidToken_key (pidToken),
      UNIQUE INDEX invoice_access_tokens_accessToken_key (accessToken),
      INDEX invoice_access_tokens_pidInvoice_idx (pidInvoice),
      INDEX invoice_access_tokens_accessToken_idx (accessToken),
      INDEX invoice_access_tokens_expiresAt_idx (expiresAt),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS invoice_bank_accounts (
      id INT NOT NULL AUTO_INCREMENT,
      pidBankAccount VARCHAR(191) NOT NULL,
      accountName VARCHAR(191) NOT NULL,
      accountNumber VARCHAR(191) NOT NULL,
      bankName VARCHAR(191) NOT NULL,
      sortCode VARCHAR(191) NULL,
      currency VARCHAR(191) NOT NULL DEFAULT 'NGN',
      country VARCHAR(191) NULL,
      notes LONGTEXT NULL,
      displayOrder INT NOT NULL DEFAULT 0,
      status VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
      createdByPidUser VARCHAR(191) NULL,
      updatedByPidUser VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      UNIQUE INDEX invoice_bank_accounts_pidBankAccount_key (pidBankAccount),
      INDEX invoice_bank_accounts_status_idx (status),
      INDEX invoice_bank_accounts_currency_idx (currency),
      INDEX invoice_bank_accounts_displayOrder_idx (displayOrder),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS invoice_payment_claims (
      id INT NOT NULL AUTO_INCREMENT,
      pidClaim VARCHAR(191) NOT NULL,
      pidInvoice VARCHAR(191) NOT NULL,
      pidUser VARCHAR(191) NULL,
      claimedAmount DECIMAL(18,2) NOT NULL,
      currency VARCHAR(191) NOT NULL DEFAULT 'NGN',
      selectedBankAccountId VARCHAR(191) NULL,
      selectedBankAccountJson LONGTEXT NULL,
      paymentReference VARCHAR(191) NULL,
      note LONGTEXT NULL,
      claimedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      status VARCHAR(191) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
      reviewedByPidUser VARCHAR(191) NULL,
      reviewedAt DATETIME(3) NULL,
      reviewNote LONGTEXT NULL,
      approvedInvoicePaymentPid VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      UNIQUE INDEX invoice_payment_claims_pidClaim_key (pidClaim),
      INDEX invoice_payment_claims_pidInvoice_idx (pidInvoice),
      INDEX invoice_payment_claims_pidUser_idx (pidUser),
      INDEX invoice_payment_claims_status_idx (status),
      INDEX invoice_payment_claims_claimedAt_idx (claimedAt),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS invoice_audit_logs (
      id INT NOT NULL AUTO_INCREMENT,
      pidAuditLog VARCHAR(191) NOT NULL,
      pidInvoice VARCHAR(191) NOT NULL,
      pidUser VARCHAR(191) NULL,
      action VARCHAR(191) NOT NULL,
      oldStatus VARCHAR(191) NULL,
      newStatus VARCHAR(191) NULL,
      metadata LONGTEXT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE INDEX invoice_audit_logs_pidAuditLog_key (pidAuditLog),
      INDEX invoice_audit_logs_pidInvoice_idx (pidInvoice),
      INDEX invoice_audit_logs_pidUser_idx (pidUser),
      INDEX invoice_audit_logs_createdAt_idx (createdAt),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS invoice_follow_ups (
      id INT NOT NULL AUTO_INCREMENT,
      pidFollowUp VARCHAR(191) NOT NULL,
      pidInvoice VARCHAR(191) NOT NULL,
      followUpNumber INT NOT NULL,
      subject VARCHAR(191) NOT NULL,
      status VARCHAR(191) NOT NULL DEFAULT 'SENT',
      error LONGTEXT NULL,
      sentAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE INDEX invoice_follow_ups_pidFollowUp_key (pidFollowUp),
      INDEX invoice_follow_ups_pidInvoice_idx (pidInvoice),
      INDEX invoice_follow_ups_sentAt_idx (sentAt),
      INDEX invoice_follow_ups_status_idx (status),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

}

export async function createOrGetInvoiceAccessToken(params: {
  pidInvoice: string;
  createdByPidUser?: string | null;
  expiresInHours?: number;
}) {
  const now = new Date();
  const tokenModel = (prisma as any).invoice_access_tokens;
  if (tokenModel) {
    const existing = await tokenModel.findFirst({
      where: {
        pidInvoice: params.pidInvoice,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    const expiresAt = new Date(now.getTime() + (params.expiresInHours ?? 24 * 30) * 60 * 60 * 1000);
    return tokenModel.create({
      data: {
        pidToken: generatePid('IVT'),
        pidInvoice: params.pidInvoice,
        accessToken: generateAccessToken(),
        expiresAt,
        createdByPidUser: params.createdByPidUser || null,
      },
    });
  }

  const rows: any[] = await prisma.$queryRawUnsafe(
    `
      SELECT *
      FROM invoice_access_tokens
      WHERE pidInvoice = ?
        AND revokedAt IS NULL
        AND expiresAt > NOW(3)
      ORDER BY createdAt DESC
      LIMIT 1
    `,
    params.pidInvoice,
  );
  if (rows.length > 0) return rows[0];

  const pidToken = generatePid('IVT');
  const accessToken = generateAccessToken();
  const expiresAt = new Date(now.getTime() + (params.expiresInHours ?? 24 * 30) * 60 * 60 * 1000);

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO invoice_access_tokens
      (pidToken, pidInvoice, accessToken, expiresAt, createdByPidUser, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))
    `,
    pidToken,
    params.pidInvoice,
    accessToken,
    expiresAt,
    params.createdByPidUser || null,
  );

  const createdRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM invoice_access_tokens WHERE pidToken = ? LIMIT 1`,
    pidToken,
  );
  return createdRows[0];
}

export async function syncOverdueInvoices(pidInvoice?: string) {
  const now = new Date();
  await prisma.invoices.updateMany({
    where: {
      ...(pidInvoice ? { pidInvoice } : {}),
      status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
      dueAt: { not: null, lt: now },
      balanceDue: { gt: 0 },
    },
    data: {
      status: 'OVERDUE',
      updatedAt: now,
    },
  });
}
