'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import {
  CORPORATE_GIFT_STATUSES,
  getNextCorporateGiftStatus,
  notifyCustomerCorporateGiftStatus,
  type CorporateGiftStatus,
  type CorporateGiftNotificationResult,
} from '@/lib/notifications/corporateGifts';

const STATUS_SET = new Set<string>(CORPORATE_GIFT_STATUSES);

async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  const payload = verifyToken(token) as { pidUser?: string } | null;
  if (!payload?.pidUser) return null;

  return prisma.admin.findUnique({
    where: { pidUser: payload.pidUser },
    select: {
      pidUser: true,
      userEmail: true,
      userFirstname: true,
    },
  });
}

export type CorporateGiftActionResult = {
  ok: boolean;
  message: string;
  notification?: CorporateGiftNotificationResult;
};

function formatNotificationMessage(notification: CorporateGiftNotificationResult | null) {
  if (!notification) return '';
  const sentChannels = notification.channels
    .filter((channel) => channel.sent)
    .map((channel) => channel.channel)
    .join(' and ');

  if (sentChannels) {
    return ` Customer notification sent by ${sentChannels}.`;
  }

  return ' Customer notification could not be sent.';
}

async function ensureCancellationReasonColumn() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE corporate_gift_request ADD COLUMN IF NOT EXISTS cancellationReason LONGTEXT NULL`,
  );
}

export async function updateCorporateGiftRequestAction(
  formData: FormData,
): Promise<CorporateGiftActionResult> {
  const pidRequest = String(formData.get('pidRequest') || '');
  const status = String(formData.get('status') || '');
  const cancellationReason = String(formData.get('cancellationReason') || '').trim();

  if (!pidRequest || !STATUS_SET.has(status)) {
    throw new Error('Invalid request payload');
  }

  if (status === 'Cancelled' && !cancellationReason) {
    throw new Error('Cancellation reason is required');
  }

  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    throw new Error('Unauthorized');
  }

  const existing = await prisma.corporate_gift_request.findUnique({
    where: { pidRequest },
  });

  if (!existing) {
    throw new Error('Request not found');
  }

  const isCancellation = status === 'Cancelled';

  if (status === 'Invoiced') {
    throw new Error('Corporate gift requests can only move to Invoiced when a linked invoice is issued.');
  }

  if (!isCancellation) {
    const expectedNextStatus = getNextCorporateGiftStatus(existing.status);
    if (!expectedNextStatus || status !== expectedNextStatus) {
      throw new Error('Invalid status transition');
    }
  }

  if (isCancellation) {
    await ensureCancellationReasonColumn();
  }

  const updated = await prisma.corporate_gift_request.update({
    where: { pidRequest },
    data: {
      status,
      handledByPidUser: currentAdmin.pidUser,
      handledByEmail: currentAdmin.userEmail,
      handledByName: currentAdmin.userFirstname || currentAdmin.userEmail,
    },
  });

  if (isCancellation) {
    await prisma.$executeRawUnsafe(
      `UPDATE corporate_gift_request SET cancellationReason = ?, updatedAt = NOW(3) WHERE pidRequest = ?`,
      cancellationReason,
      pidRequest,
    );
  }

  let notification: CorporateGiftNotificationResult | null = null;
  if (existing.status !== status) {
    notification = await notifyCustomerCorporateGiftStatus({
      requestId: updated.pidRequest,
      businessName: updated.businessName,
      contactPersonFullName: updated.contactPersonFullName,
      contactEmail: updated.contactEmail,
      whatsappNumber: updated.whatsappNumber,
      status: status as CorporateGiftStatus,
      handledByName: updated.handledByName,
      cancellationReason: isCancellation ? cancellationReason : null,
    });
  }

  revalidatePath('/dashboard/corporate-gifts');
  return {
    ok: true,
    message: `Corporate gift request updated to ${status}.${formatNotificationMessage(notification)}`,
    notification: notification || undefined,
  };
}

export async function updateCorporateGiftRequestFormAction(formData: FormData) {
  await updateCorporateGiftRequestAction(formData);
}

export async function assignCorporateGiftRequestAction(formData: FormData) {
  const pidRequest = String(formData.get('pidRequest') || '');
  if (!pidRequest) throw new Error('Invalid request id');

  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) throw new Error('Unauthorized');

  await prisma.corporate_gift_request.update({
    where: { pidRequest },
    data: {
      handledByPidUser: currentAdmin.pidUser,
      handledByEmail: currentAdmin.userEmail,
      handledByName: currentAdmin.userFirstname || currentAdmin.userEmail,
    },
  });

  revalidatePath('/dashboard/corporate-gifts');
}
