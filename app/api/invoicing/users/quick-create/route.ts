import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, unauthorized } from '../../_lib/invoicing';
import randomGenerator from '@/lib/helpers/randomGenerator';
import xMail from '@/lib/email/xMail2';

function generatePidUser() {
  return `USR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
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

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const body = await request.json();
    const firstName = String(body?.userFirstname || '').trim();
    const lastName = String(body?.userLastname || '').trim();
    const userEmail = String(body?.userEmail || '').trim().toLowerCase();
    const phone = String(body?.phone || '').trim();
    const country = String(body?.country || '').trim();
    const sendSetupLink = body?.sendSetupLink !== false;

    if (!firstName) {
      return NextResponse.json({ statusx: 'ERROR', message: 'First name is required' }, { status: 400 });
    }
    if (!userEmail) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Email is required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Enter a valid email address' }, { status: 400 });
    }

    const existing = await prisma.users.findUnique({ where: { userEmail } });
    if (existing) {
      let setupLinkSent = false;
      if (sendSetupLink) {
        try {
          await sendPasswordSetupLink({ userEmail: existing.userEmail, pidUser: existing.pidUser });
          setupLinkSent = true;
        } catch {
          setupLinkSent = false;
        }
      }

      return NextResponse.json(
        {
          statusx: 'EXISTS',
          message: 'A registered user already exists with this email',
          data: {
            pidUser: existing.pidUser,
            userFirstname: existing.userFirstname,
            userLastname: existing.userLastname,
            userEmail: existing.userEmail,
            userPhone: existing.userPhone,
          },
          setupLinkSent,
        },
        { status: 200 },
      );
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

    let setupLinkSent = false;
    if (sendSetupLink) {
      try {
        await sendPasswordSetupLink({ userEmail: created.userEmail, pidUser: created.pidUser });
        setupLinkSent = true;
      } catch {
        setupLinkSent = false;
      }
    }

    return NextResponse.json({ statusx: 'SUCCESS', data: created, setupLinkSent }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to create user', error: error.message },
      { status: 500 },
    );
  }
}
