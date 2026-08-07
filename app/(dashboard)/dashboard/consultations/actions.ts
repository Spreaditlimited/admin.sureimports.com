'use server';

import { revalidatePath } from 'next/cache';

import { requireConsultationsEditAccess } from '@/lib/consultationAccess';
import { prisma } from '@/lib/prisma';

function clean(value: FormDataEntryValue | null, max = 6000) {
  return String(value || '').trim().slice(0, max);
}

const BOOKING_STATUSES = new Set([
  'booked',
  'rescheduled',
  'completed',
  'no_show',
  'follow_up',
  'cancelled',
  'zoom_failed',
  'payment_failed',
  'payment_conflict',
  'pending_payment',
  'fulfilling',
]);
const OUTCOME_STATUSES = new Set([
  '',
  'completed',
  'won',
  'lost',
  'follow_up',
  'no_show',
]);

export async function updateConsultationBookingAction(formData: FormData) {
  await requireConsultationsEditAccess();

  const pidBooking = clean(formData.get('pidBooking'), 80);
  const status = clean(formData.get('status'), 40) || 'booked';
  const assignedOwner = clean(formData.get('assignedOwner'), 180);
  const callOutcomeStatus = clean(formData.get('callOutcomeStatus'), 40);
  const outcomeFeedback = clean(formData.get('outcomeFeedback'));
  const cancelReason = clean(formData.get('cancelReason'), 500);
  const nextFollowUpRaw = clean(formData.get('nextFollowUpAt'), 80);
  const nextFollowUpAt = nextFollowUpRaw ? new Date(nextFollowUpRaw) : null;

  if (!pidBooking) throw new Error('Invalid booking id');
  if (!BOOKING_STATUSES.has(status)) throw new Error('Invalid booking status');
  if (!OUTCOME_STATUSES.has(callOutcomeStatus)) {
    throw new Error('Invalid call outcome status');
  }

  const rows = await prisma.$queryRaw<
    Array<{
      email: string;
      fullName: string;
      status: string;
      manageToken: string;
    }>
  >`
    SELECT email, fullName, status, manageToken
    FROM consultation_bookings
    WHERE pidBooking = ${pidBooking}
    LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) throw new Error('Booking not found');

  if (status === 'cancelled' && booking.status !== 'cancelled') {
    const siteUrl = (
      process.env.SUREIMPORTS_SITE_URL || 'https://www.sureimports.com'
    ).replace(/\/$/, '');
    const response = await fetch(
      `${siteUrl}/api/consultation/manage/cancel`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manageToken: booking.manageToken }),
        cache: 'no-store',
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(
        result?.message ||
          'Could not cancel the Zoom meeting. The booking was not changed.',
      );
    }
  }

  await prisma.$executeRaw`
    UPDATE consultation_bookings
    SET
      status = ${status},
      assignedOwner = ${assignedOwner || null},
      callOutcomeStatus = ${callOutcomeStatus || null},
      outcomeFeedback = ${outcomeFeedback || null},
      nextFollowUpAt = ${nextFollowUpAt && Number.isFinite(nextFollowUpAt.getTime()) ? nextFollowUpAt : null},
      cancelReason = ${status === 'cancelled' ? cancelReason || null : null},
      cancelledAt = ${status === 'cancelled' ? new Date() : null},
      updatedAt = ${new Date()}
    WHERE pidBooking = ${pidBooking}
  `;

  revalidatePath('/dashboard/consultations');
}

export async function reconcileConsultationBookingAction(formData: FormData) {
  await requireConsultationsEditAccess();
  const pidBooking = clean(formData.get('pidBooking'), 80);
  if (!pidBooking) throw new Error('Invalid booking id');

  const rows = await prisma.$queryRaw<
    Array<{ paystackReference: string | null }>
  >`
    SELECT paystackReference
    FROM consultation_bookings
    WHERE pidBooking = ${pidBooking}
    LIMIT 1
  `;
  const reference = rows[0]?.paystackReference;
  if (!reference) throw new Error('This booking has no Paystack reference');

  const siteUrl = (
    process.env.SUREIMPORTS_SITE_URL || 'https://www.sureimports.com'
  ).replace(/\/$/, '');
  const response = await fetch(`${siteUrl}/api/consultation/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    throw new Error(result?.message || 'Could not reconcile this booking');
  }

  revalidatePath('/dashboard/consultations');
}
