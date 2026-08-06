'use server';

import { revalidatePath } from 'next/cache';

import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';
import { prisma } from '@/lib/prisma';
import { assertSocialAdmin } from '@/lib/social/auth';
import { generateDailySocialCampaign, sendSocialApprovalEmail } from '@/lib/social/generator';
import { publishSocialCampaign } from '@/lib/social/meta';
import { validateSocialCopy, type SocialCopy } from '@/lib/social/openai';
import { renderSocialDesign } from '@/lib/social/render';
import { assertSocialStudioEnabled } from '@/lib/social/config';

const path = '/dashboard/social-studio';
const value = (data: FormData, key: string, max = 10000) => String(data.get(key) || '').trim().slice(0, max);

export async function generateSocialDraft() {
  assertSocialStudioEnabled();
  await assertSocialAdmin('edit');
  await generateDailySocialCampaign({ force: true });
  revalidatePath(path);
}

export async function saveSocialCampaign(data: FormData) {
  assertSocialStudioEnabled();
  await assertSocialAdmin('edit');
  const pidCampaign = value(data, 'pidCampaign', 80);
  const campaign = await prisma.social_campaign.findUnique({ where: { pidCampaign } });
  if (!campaign) throw new Error('Campaign not found.');
  if (['published', 'partial'].includes(campaign.status)) throw new Error('A published campaign cannot be edited.');
  if (!campaign.backgroundImageUrl) throw new Error('Campaign background is missing.');
  const copy: SocialCopy = {
    headline: value(data, 'headline', 255), accentPhrase: value(data, 'accentPhrase', 120),
    subtext: value(data, 'subtext', 500), actionLabel: value(data, 'actionLabel', 255),
    instagramCaption: value(data, 'instagramCaption'), facebookCaption: value(data, 'facebookCaption'),
    imagePrompt: campaign.imagePrompt, demandRationale: campaign.demandRationale || '', includeWhatsapp: data.get('includeWhatsapp') === 'on',
  };
  validateSocialCopy(copy);
  const backgroundResponse = await fetch(campaign.backgroundImageUrl);
  if (!backgroundResponse.ok) throw new Error('Could not retrieve the supporting image.');
  const design = await renderSocialDesign(Buffer.from(await backgroundResponse.arrayBuffer()), copy);
  const publicId = campaign.designPublicId?.split('/').pop() || pidCampaign.toLowerCase();
  const upload = await uploadBufferToCloudinary(design, {
    folder: 'admin-sureimports/social/campaigns', publicId, overwrite: true,
    uniqueFilename: false, useFilename: false, tags: ['social-studio', 'approval-required', campaign.contentPillar],
  });
  await prisma.social_campaign.update({ where: { pidCampaign }, data: {
    headline: copy.headline, accentPhrase: copy.accentPhrase, subtext: copy.subtext,
    actionLabel: copy.actionLabel, instagramCaption: copy.instagramCaption,
    facebookCaption: copy.facebookCaption, includeWhatsapp: copy.includeWhatsapp,
    designImageUrl: `${upload.url}?v=${Date.now()}`, designPublicId: upload.publicId,
    status: 'awaiting_approval', approvedAt: null, approvedBy: null, lastError: null,
  } });
  revalidatePath(path);
}

export async function approveSocialCampaign(data: FormData) {
  assertSocialStudioEnabled();
  const admin = await assertSocialAdmin('edit'); const pidCampaign = value(data, 'pidCampaign', 80);
  const result = await prisma.social_campaign.updateMany({ where: { pidCampaign, status: 'awaiting_approval' }, data: { status: 'approved', approvedAt: new Date(), approvedBy: admin.pidUser, lastError: null } });
  if (!result.count) throw new Error('Only campaigns awaiting approval can be approved.');
  revalidatePath(path);
}

export async function rejectSocialCampaign(data: FormData) {
  assertSocialStudioEnabled();
  const admin = await assertSocialAdmin('edit'); const pidCampaign = value(data, 'pidCampaign', 80);
  const note = value(data, 'rejectionNote', 500) || 'Rejected by admin';
  await prisma.social_campaign.update({ where: { pidCampaign }, data: { status: 'rejected', approvedAt: null, approvedBy: admin.pidUser, lastError: `Rejected: ${note}` } });
  revalidatePath(path);
}

export async function publishSocialCampaignNow(data: FormData) {
  assertSocialStudioEnabled();
  await assertSocialAdmin('edit'); await publishSocialCampaign(value(data, 'pidCampaign', 80)); revalidatePath(path);
}

export async function resendSocialApproval(data: FormData) {
  assertSocialStudioEnabled();
  await assertSocialAdmin('edit'); const campaign = await prisma.social_campaign.findUnique({ where: { pidCampaign: value(data, 'pidCampaign', 80) } });
  if (!campaign) throw new Error('Campaign not found.');
  await sendSocialApprovalEmail(campaign); await prisma.social_campaign.update({ where: { pidCampaign: campaign.pidCampaign }, data: { lastError: null } });
  revalidatePath(path);
}
