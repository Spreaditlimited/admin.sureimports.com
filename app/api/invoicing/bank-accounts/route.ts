import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePid, requireAdmin, unauthorized } from '../_lib/invoicing';

export async function GET() {
  try {
    const model = (prisma as any).invoice_bank_accounts;
    const accounts = model
      ? await model.findMany({
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
        })
      : await prisma.$queryRawUnsafe(`
          SELECT *
          FROM invoice_bank_accounts
          ORDER BY displayOrder ASC, createdAt ASC
        `);
    return NextResponse.json({ statusx: 'SUCCESS', data: accounts });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to fetch bank accounts', error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const body = await request.json();
    const payload = {
      pidBankAccount: generatePid('IBA'),
      accountName: String(body?.accountName || '').trim(),
      accountNumber: String(body?.accountNumber || '').trim(),
      bankName: String(body?.bankName || '').trim(),
      sortCode: body?.sortCode ? String(body.sortCode).trim() : null,
      currency: String(body?.currency || 'NGN').trim().toUpperCase(),
      country: body?.country ? String(body.country).trim() : null,
      notes: body?.notes ? String(body.notes) : null,
      displayOrder: Number(body?.displayOrder || 0) || 0,
      status: body?.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      createdByPidUser: admin.pidUser,
      updatedByPidUser: admin.pidUser,
    };

    const model = (prisma as any).invoice_bank_accounts;
    const created = model
      ? await model.create({ data: payload })
      : await (async () => {
          await prisma.$executeRawUnsafe(
            `
            INSERT INTO invoice_bank_accounts
            (pidBankAccount, accountName, accountNumber, bankName, sortCode, currency, country, notes, displayOrder, status, createdByPidUser, updatedByPidUser, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))
          `,
            payload.pidBankAccount,
            payload.accountName,
            payload.accountNumber,
            payload.bankName,
            payload.sortCode,
            payload.currency,
            payload.country,
            payload.notes,
            payload.displayOrder,
            payload.status,
            payload.createdByPidUser,
            payload.updatedByPidUser,
          );
          const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM invoice_bank_accounts WHERE pidBankAccount = ? LIMIT 1`,
            payload.pidBankAccount,
          );
          return rows[0];
        })();
    return NextResponse.json({ statusx: 'SUCCESS', data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to create bank account', error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const body = await request.json();
    const pidBankAccount = String(body?.pidBankAccount || '');
    if (!pidBankAccount) {
      return NextResponse.json({ statusx: 'ERROR', message: 'pidBankAccount is required' }, { status: 400 });
    }

    const model = (prisma as any).invoice_bank_accounts;
    const updated = model
      ? await model.update({
          where: { pidBankAccount },
          data: {
            accountName: body?.accountName !== undefined ? String(body.accountName).trim() : undefined,
            accountNumber: body?.accountNumber !== undefined ? String(body.accountNumber).trim() : undefined,
            bankName: body?.bankName !== undefined ? String(body.bankName).trim() : undefined,
            sortCode: body?.sortCode !== undefined ? (body.sortCode ? String(body.sortCode).trim() : null) : undefined,
            currency: body?.currency !== undefined ? String(body.currency).trim().toUpperCase() : undefined,
            country: body?.country !== undefined ? (body.country ? String(body.country).trim() : null) : undefined,
            notes: body?.notes !== undefined ? (body.notes ? String(body.notes) : null) : undefined,
            displayOrder: body?.displayOrder !== undefined ? Number(body.displayOrder) || 0 : undefined,
            status: body?.status !== undefined ? (body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') : undefined,
            updatedByPidUser: admin.pidUser,
          },
        })
      : await (async () => {
          const updates: string[] = [];
          const values: any[] = [];
          if (body?.accountName !== undefined) { updates.push('accountName = ?'); values.push(String(body.accountName).trim()); }
          if (body?.accountNumber !== undefined) { updates.push('accountNumber = ?'); values.push(String(body.accountNumber).trim()); }
          if (body?.bankName !== undefined) { updates.push('bankName = ?'); values.push(String(body.bankName).trim()); }
          if (body?.sortCode !== undefined) { updates.push('sortCode = ?'); values.push(body.sortCode ? String(body.sortCode).trim() : null); }
          if (body?.currency !== undefined) { updates.push('currency = ?'); values.push(String(body.currency).trim().toUpperCase()); }
          if (body?.country !== undefined) { updates.push('country = ?'); values.push(body.country ? String(body.country).trim() : null); }
          if (body?.notes !== undefined) { updates.push('notes = ?'); values.push(body.notes ? String(body.notes) : null); }
          if (body?.displayOrder !== undefined) { updates.push('displayOrder = ?'); values.push(Number(body.displayOrder) || 0); }
          if (body?.status !== undefined) { updates.push('status = ?'); values.push(body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'); }
          updates.push('updatedByPidUser = ?'); values.push(admin.pidUser);
          updates.push('updatedAt = NOW(3)');
          values.push(pidBankAccount);

          await prisma.$executeRawUnsafe(
            `UPDATE invoice_bank_accounts SET ${updates.join(', ')} WHERE pidBankAccount = ?`,
            ...values,
          );
          const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM invoice_bank_accounts WHERE pidBankAccount = ? LIMIT 1`,
            pidBankAccount,
          );
          return rows[0];
        })();
    return NextResponse.json({ statusx: 'SUCCESS', data: updated });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to update bank account', error: error.message }, { status: 500 });
  }
}
