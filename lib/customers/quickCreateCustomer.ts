import { prisma } from '@/lib/prisma';
import randomGenerator from '@/lib/helpers/randomGenerator';
import xMail from '@/lib/email/xMail2';

export type QuickCreateCustomerInput = {
  userFirstname?: unknown;
  userLastname?: unknown;
  userEmail?: unknown;
  phone?: unknown;
  country?: unknown;
  businessName?: unknown;
  sendSetupLink?: unknown;
};

export type QuickCreateCustomerResult = {
  status: 'SUCCESS' | 'EXISTS';
  message?: string;
  data: {
    pidUser: string;
    userFirstname: string | null;
    userLastname: string | null;
    userEmail: string;
    userPhone: string | null;
    businessName: string | null;
  };
  setupLinkSent: boolean;
};

function generatePidUser() {
  return `USR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function ensureUsersBusinessNameColumn() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS businessName VARCHAR(191) NULL`,
  );
}

async function getUserBusinessName(pidUser: string) {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT businessName FROM users WHERE pidUser = ? LIMIT 1`,
    pidUser,
  )) as Array<{ businessName: string | null }>;
  return rows[0]?.businessName || null;
}

async function sendPasswordSetupLink(params: { userEmail: string; pidUser: string }) {
  const resetCode = randomGenerator(6);
  await prisma.users.update({
    where: { userEmail: params.userEmail },
    data: { cidStatus: resetCode },
  });

  const baseUrl = process.env.SUREIMPORTS_SITE_URL || 'https://sureimports.com';
  const link = `${baseUrl}/auth/password-reset-link?pidUser=${params.pidUser}&resetCode=${resetCode}`;

  await xMail({
    xEmail: params.userEmail,
    xTitle: 'Set Up Your Sure Imports Password',
    xBodyTitle: 'Complete Account Setup',
    xBody1: 'Your account has been created so you can receive invoices and updates.',
    xBody2: 'Use the button below to set your password and sign in to your customer dashboard.',
    xButtonTitle: 'Set Password',
    xButtonLink: link,
  });
}

export async function quickCreateCustomer(input: QuickCreateCustomerInput): Promise<QuickCreateCustomerResult> {
  const firstName = String(input?.userFirstname || '').trim();
  const lastName = String(input?.userLastname || '').trim();
  const userEmail = String(input?.userEmail || '').trim().toLowerCase();
  const phone = String(input?.phone || '').trim();
  const country = String(input?.country || '').trim();
  const businessName = String(input?.businessName || '').trim();
  const sendSetupLink = input?.sendSetupLink !== false;

  await ensureUsersBusinessNameColumn();

  if (!firstName) {
    throw Object.assign(new Error('First name is required'), { statusCode: 400 });
  }
  if (!userEmail) {
    throw Object.assign(new Error('Email is required'), { statusCode: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
    throw Object.assign(new Error('Enter a valid email address'), { statusCode: 400 });
  }

  const existing = await prisma.users.findUnique({ where: { userEmail } });
  if (existing) {
    if (businessName) {
      await prisma.$executeRawUnsafe(
        `UPDATE users SET businessName = ?, updatedAt = NOW(3) WHERE pidUser = ?`,
        businessName,
        existing.pidUser,
      );
    }

    let setupLinkSent = false;
    if (sendSetupLink) {
      try {
        await sendPasswordSetupLink({ userEmail: existing.userEmail, pidUser: existing.pidUser });
        setupLinkSent = true;
      } catch {
        setupLinkSent = false;
      }
    }

    return {
      status: 'EXISTS',
      message: 'A registered user already exists with this email',
      data: {
        pidUser: existing.pidUser,
        userFirstname: existing.userFirstname,
        userLastname: existing.userLastname,
        userEmail: existing.userEmail,
        userPhone: existing.userPhone,
        businessName: businessName || (await getUserBusinessName(existing.pidUser)),
      },
      setupLinkSent,
    };
  }

  const created = await prisma.users.create({
    data: {
      pidUser: generatePidUser(),
      userFirstname: firstName,
      userLastname: lastName || null,
      userEmail,
      email: userEmail,
      phone: phone || null,
      userPhone: phone || null,
      country: country || null,
      userCountry: country || null,
      userStatus: 'ACTIVE',
    },
    select: {
      pidUser: true,
      userFirstname: true,
      userLastname: true,
      userEmail: true,
      userPhone: true,
    },
  });

  if (businessName) {
    await prisma.$executeRawUnsafe(
      `UPDATE users SET businessName = ?, updatedAt = NOW(3) WHERE pidUser = ?`,
      businessName,
      created.pidUser,
    );
  }

  const persistedBusinessName = businessName || (await getUserBusinessName(created.pidUser));

  let setupLinkSent = false;
  if (sendSetupLink) {
    try {
      await sendPasswordSetupLink({ userEmail: created.userEmail, pidUser: created.pidUser });
      setupLinkSent = true;
    } catch {
      setupLinkSent = false;
    }
  }

  return {
    status: 'SUCCESS',
    data: {
      ...created,
      businessName: persistedBusinessName,
    },
    setupLinkSent,
  };
}
