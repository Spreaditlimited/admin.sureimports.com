import 'server-only';

import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import sendEmail from '@/lib/email/config/sendEmail';
import { affiliateFingerprint, decryptAffiliateValue } from '@/lib/affiliate/security';

type Fact = { label: string; value: string };

export type AffiliateAccountNotification = {
  affiliateId: number;
  eventKey: string;
  eventType: string;
  subject: string;
  title: string;
  message: string;
  facts?: Fact[];
  actionLabel?: string;
  actionPath?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!);
}

function clean(value: unknown, max: number) {
  return String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}

function bodyHtml(firstName: string, input: AffiliateAccountNotification) {
  const facts = (input.facts || []).map((fact) => `<tr><td style="padding:7px 12px;color:#64748b;font-size:13px;">${escapeHtml(fact.label)}</td><td align="right" style="padding:7px 12px;color:#0f172a;font-size:13px;font-weight:700;">${escapeHtml(fact.value)}</td></tr>`).join('');
  const base = (process.env.AFFILIATE_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://affiliate.sureimports.com' : 'http://localhost:3000')).replace(/\/$/, '');
  const href = `${base}${input.actionPath || '/dashboard'}`;
  return `<p style="margin:0 0 14px 0;">Hello ${escapeHtml(firstName || 'there')},</p><p style="margin:0;">${escapeHtml(input.message)}</p>${facts ? `<table width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">${facts}</table>` : ''}<p style="margin:20px 0 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-size:14px;font-weight:700;">${escapeHtml(input.actionLabel || 'Open affiliate dashboard')}</a></p>`;
}

async function claimEvent(input: AffiliateAccountNotification, recipient: string) {
  const now = new Date();
  const eventKey = clean(input.eventKey, 191);
  try {
    return await prisma.affiliate_email_events.create({
      data: {
        pidEvent: `aemail_${randomBytes(18).toString('base64url')}`,
        eventKey,
        eventType: clean(input.eventType, 80),
        recipientHash: affiliateFingerprint(recipient.trim().toLowerCase()),
        status: 'PENDING',
        attempts: 1,
        lockedAt: now,
      },
      select: { id: true },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
  }

  const staleAt = new Date(now.getTime() - 5 * 60_000);
  const existing = await prisma.affiliate_email_events.findUnique({ where: { eventKey } });
  if (!existing || existing.status === 'SENT') return null;
  const claimed = await prisma.affiliate_email_events.updateMany({
    where: {
      id: existing.id,
      status: { not: 'SENT' },
      OR: [{ status: 'FAILED' }, { lockedAt: null }, { lockedAt: { lte: staleAt } }],
    },
    data: { status: 'PENDING', attempts: { increment: 1 }, lockedAt: now, lastError: null },
  });
  return claimed.count === 1 ? { id: existing.id } : null;
}

export async function sendAffiliateAccountNotification(input: AffiliateAccountNotification) {
  const account = await prisma.affiliate_accounts.findUnique({
    where: { id: input.affiliateId },
    select: { emailCiphertext: true, firstNameCiphertext: true },
  });
  if (!account) return { sent: false, duplicate: false };
  const to = decryptAffiliateValue(account.emailCiphertext);
  const firstName = decryptAffiliateValue(account.firstNameCiphertext);
  const claimed = await claimEvent(input, to);
  if (!claimed) return { sent: false, duplicate: true };

  try {
    await sendEmail(to, clean(input.subject, 180), bodyHtml(firstName, input));
    await prisma.affiliate_email_events.update({
      where: { id: claimed.id },
      data: { status: 'SENT', sentAt: new Date(), lockedAt: null, lastError: null },
    });
    return { sent: true, duplicate: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email delivery failed.';
    await prisma.affiliate_email_events.update({
      where: { id: claimed.id },
      data: { status: 'FAILED', lockedAt: null, lastError: clean(message, 500) },
    }).catch(() => undefined);
    console.error(`Affiliate email ${clean(input.eventType, 80)} failed:`, message);
    return { sent: false, duplicate: false };
  }
}
