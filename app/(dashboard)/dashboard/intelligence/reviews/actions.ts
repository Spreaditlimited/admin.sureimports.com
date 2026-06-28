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

function dashboardUrl(path: string) {
  const baseUrl =
    process.env.SUREIMPORTS_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://www.sureimports.com';
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

export async function updateIntelligenceReviewRequestAction(formData: FormData) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) throw new Error('Unauthorized');

  const pidRequest = clean(formData.get('pidRequest'), 80);
  const status = clean(formData.get('status'), 40) || 'in_review';
  const adminRiskLevel = clean(formData.get('adminRiskLevel'), 40);
  const adminResponse = clean(formData.get('adminResponse'));
  const adminRecommendations = clean(formData.get('adminRecommendations'));

  if (!pidRequest) throw new Error('Invalid request id');
  if (status === 'answered' && !adminResponse) {
    throw new Error('Add a response before marking the request answered.');
  }

  const existingRows = await prisma.$queryRaw<
    Array<{ email: string; supplierName: string | null; nicheName: string | null }>
  >`
    SELECT email, supplierName, nicheName
    FROM intelligence_review_requests
    WHERE pidRequest = ${pidRequest}
    LIMIT 1
  `;

  const existing = existingRows[0];
  if (!existing) throw new Error('Review request not found');

  await prisma.$executeRaw`
    UPDATE intelligence_review_requests
    SET
      status = ${status},
      adminRiskLevel = ${adminRiskLevel || null},
      adminResponse = ${adminResponse || null},
      adminRecommendations = ${adminRecommendations || null},
      reviewedByPidUser = ${currentAdmin.pidUser},
      reviewedByEmail = ${currentAdmin.userEmail},
      reviewedByName = ${
        [currentAdmin.userFirstname, currentAdmin.userLastname]
          .filter(Boolean)
          .join(' ') || currentAdmin.userEmail
      },
      reviewedAt = ${new Date()},
      updatedAt = ${new Date()}
    WHERE pidRequest = ${pidRequest}
  `;

  if (status === 'answered' && existing.email) {
    await xMail({
      xEmail: existing.email,
      xTitle: `Sure Imports review completed - ${pidRequest}`,
      xBodyTitle: 'Your Supplier Intelligence review is ready',
      xBody1: `Hello,<br />Sure Imports has completed your review request for <b>${
        existing.supplierName || existing.nicheName || pidRequest
      }</b>.`,
      xBody2:
        'Log in to your dashboard to read the response, risk notes and recommended next steps before paying any supplier.',
      xButtonTitle: 'View Review',
      xButtonLink: dashboardUrl('/dashboard/intelligence/reviews'),
    });
  }

  revalidatePath('/dashboard/intelligence/reviews');
}
