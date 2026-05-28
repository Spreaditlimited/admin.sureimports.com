import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

async function getAuthPidUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token) as { pidUser?: string } | null;
  if (!payload?.pidUser) return null;
  return payload.pidUser;
}

export async function GET() {
  try {
    const pidUser = await getAuthPidUser();
    if (!pidUser) return NextResponse.json({ statusx: 'ERROR', message: 'Unauthorized' }, { status: 401 });

    const admin = await prisma.admin.findUnique({
      where: { pidUser },
      select: { updatedAt: true },
    });
    if (!admin) return NextResponse.json({ statusx: 'ERROR', message: 'Account not found' }, { status: 404 });

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: {
        lastSyncAt: admin.updatedAt ? admin.updatedAt.toISOString() : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to fetch settings metadata', error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const pidUser = await getAuthPidUser();
    if (!pidUser) return NextResponse.json({ statusx: 'ERROR', message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Current and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ statusx: 'ERROR', message: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { pidUser } });
    if (!admin?.userPassword) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Account not found' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, admin.userPassword);
    if (!isValid) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Current password is incorrect' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.admin.update({
      where: { pidUser },
      data: {
        userPassword: hashedPassword,
        updatedAt: new Date(),
      },
      select: {
        updatedAt: true,
      },
    });

    return NextResponse.json({
      statusx: 'SUCCESS',
      message: 'Password updated successfully',
      data: {
        lastSyncAt: updated.updatedAt ? updated.updatedAt.toISOString() : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ statusx: 'ERROR', message: 'Failed to update password', error: error.message }, { status: 500 });
  }
}
