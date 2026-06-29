'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import xMail from '@/lib/email/xMail';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

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
      userLastname: true,
    },
  });
}

function clean(value: FormDataEntryValue | null, max = 6000) {
  return String(value || '').trim().slice(0, max);
}

export async function updateConsultationBookingAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) throw new Error('Unauthorized');

  const pidBooking = clean(formData.get('pidBooking'), 80);
  const status = clean(formData.get('status'), 40) || 'booked';
  const assignedOwner = clean(formData.get('assignedOwner'), 180);
  const callOutcomeStatus = clean(formData.get('callOutcomeStatus'), 40);
  const outcomeFeedback = clean(formData.get('outcomeFeedback'));
  const cancelReason = clean(formData.get('cancelReason'), 500);
  const nextFollowUpRaw = clean(formData.get('nextFollowUpAt'), 80);
  const nextFollowUpAt = nextFollowUpRaw ? new Date(nextFollowUpRaw) : null;

  if (!pidBooking) throw new Error('Invalid booking id');

  const rows = await prisma.$queryRaw<
    Array<{ email: string; fullName: string; status: string }>
  >`
    SELECT email, fullName, status
    FROM consultation_bookings
    WHERE pidBooking = ${pidBooking}
    LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) throw new Error('Booking not found');

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

  if (status === 'cancelled' && booking.status !== 'cancelled') {
    await xMail({
      xEmail: booking.email,
      xTitle: 'Sure Imports consultation cancelled',
      xBodyTitle: 'Consultation cancelled',
      xBody1: `Hello ${booking.fullName},<br />Your Sure Imports consultation has been cancelled.`,
      xBody2: cancelReason
        ? `Reason: ${cancelReason}`
        : 'Please contact Sure Imports if you need to book another time.',
      xButtonTitle: 'Book Again',
      xButtonLink: 'https://www.sureimports.com/book-consultation',
    });
  }

  revalidatePath('/dashboard/consultations');
}
