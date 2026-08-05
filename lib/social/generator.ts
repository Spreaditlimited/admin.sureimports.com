import crypto from 'crypto';

import { uploadBufferToCloudinary } from '@/lib/cloudinary/upload';
import sendEmail from '@/lib/email/config/sendEmail';
import { prisma } from '@/lib/prisma';
import { adminBaseUrl, SOCIAL_APPROVAL_EMAIL } from '@/lib/social/config';
import { generateSocialCopy, generateSupportingImage, verifyDemandCreation } from '@/lib/social/openai';
import { renderSocialDesign } from '@/lib/social/render';
import { selectDailySocialSource } from '@/lib/social/sources';
import { formatWat, nextWatPublishingSlot, watDayStart } from '@/lib/social/time';

function campaignId() { return `SOC${crypto.randomBytes(9).toString('hex').toUpperCase()}`; }

export async function sendSocialApprovalEmail(campaign: { pidCampaign: string; headline: string; designImageUrl: string | null; scheduledFor: Date | null }) {
  const url = `${adminBaseUrl()}/dashboard/social-studio#${campaign.pidCampaign}`;
  await sendEmail(SOCIAL_APPROVAL_EMAIL, `Approval needed: ${campaign.headline}`, `
    <p>A new Sure Imports social campaign is ready for admin review.</p>
    <p><strong>${campaign.headline}</strong></p>
    <p>Proposed publication: ${formatWat(campaign.scheduledFor)} WAT.</p>
    ${campaign.designImageUrl ? `<p><img src="${campaign.designImageUrl}" alt="Campaign preview" style="display:block;width:100%;max-width:520px;border-radius:16px" /></p>` : ''}
    <p>Nothing will be published until an authorised admin approves it.</p>
    <p><a href="${url}">Review in Admin Social Studio</a></p>`);
}

export async function generateDailySocialCampaign(options: { force?: boolean } = {}) {
  const now = new Date();
  if (!options.force) {
    const existing = await prisma.social_campaign.findFirst({ where: { createdAt: { gte: watDayStart(now) } }, orderBy: { createdAt: 'desc' } });
    if (existing) return { campaign: existing, created: false };
  }
  const source = await selectDailySocialSource(now);
  const copy = await generateSocialCopy(source);
  await verifyDemandCreation(source, copy);
  const imagePrompt = `${copy.imagePrompt}\nSquare premium editorial campaign photograph. Deep slate-violet shadows, warm neutral materials and restrained orange accents. Keep the main subject on the right half and clean dark negative space on the left. No text, letters, numbers, logos, flags, currency, watermarks or identifiable people.`;
  const background = await generateSupportingImage(imagePrompt);
  const pidCampaign = campaignId();
  const backgroundUpload = await uploadBufferToCloudinary(background, {
    folder: 'admin-sureimports/social/backgrounds', publicId: `${pidCampaign.toLowerCase()}-background`,
    overwrite: false, uniqueFilename: false, useFilename: false, tags: ['social-studio', source.pillar],
  });
  const design = await renderSocialDesign(background, copy);
  const designUpload = await uploadBufferToCloudinary(design, {
    folder: 'admin-sureimports/social/campaigns', publicId: pidCampaign.toLowerCase(),
    overwrite: false, uniqueFilename: false, useFilename: false, tags: ['social-studio', 'approval-required', source.pillar],
  });
  const campaign = await prisma.social_campaign.create({ data: {
    pidCampaign, sourceType: source.type, sourceRef: source.ref, sourceTitle: source.title,
    contentPillar: source.pillar, status: 'awaiting_approval', headline: copy.headline,
    accentPhrase: copy.accentPhrase, subtext: copy.subtext, actionLabel: copy.actionLabel,
    instagramCaption: copy.instagramCaption, facebookCaption: copy.facebookCaption,
    imagePrompt, demandRationale: copy.demandRationale, includeWhatsapp: copy.includeWhatsapp,
    backgroundImageUrl: backgroundUpload.url, backgroundPublicId: backgroundUpload.publicId,
    designImageUrl: designUpload.url, designPublicId: designUpload.publicId,
    scheduledFor: nextWatPublishingSlot(now, true),
  } });
  try { await sendSocialApprovalEmail(campaign); }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Approval email failed';
    await prisma.social_campaign.update({ where: { pidCampaign }, data: { lastError: `Approval email failed: ${message}` } });
    throw error;
  }
  return { campaign, created: true };
}
