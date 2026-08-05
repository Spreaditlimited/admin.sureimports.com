import crypto from 'crypto';

import { prisma } from '@/lib/prisma';
import { decryptSocialToken } from '@/lib/social/crypto';
import { META_GRAPH_VERSION } from '@/lib/social/config';

const graph = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

async function metaPost(path: string, body: Record<string, string>) {
  const response = await fetch(`${graph}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
  const payload = await response.json();
  if (!response.ok || payload?.error) throw new Error(payload?.error?.message || `Meta request failed (${response.status})`);
  return payload;
}

async function connection() {
  const item = await prisma.social_connection.findUnique({ where: { platform: 'meta' } });
  if (!item || item.status !== 'active') throw new Error('Meta is not connected.');
  if (!item.pageId || !item.instagramUserId) throw new Error('Connected Meta record is incomplete.');
  if (item.tokenExpiresAt && item.tokenExpiresAt <= new Date()) throw new Error('Meta access token has expired; reconnect Meta.');
  return { ...item, token: decryptSocialToken(item.encryptedAccessToken) };
}

async function publishFacebook(campaign: any, account: Awaited<ReturnType<typeof connection>>) {
  const result = await metaPost(`${account.pageId}/photos`, { url: campaign.designImageUrl, caption: campaign.facebookCaption, published: 'true', access_token: account.token });
  const id = String(result.post_id || result.id);
  return { id, url: `https://www.facebook.com/${id}` };
}

async function publishInstagram(campaign: any, account: Awaited<ReturnType<typeof connection>>) {
  const container = await metaPost(`${account.instagramUserId}/media`, { image_url: campaign.designImageUrl, caption: campaign.instagramCaption, access_token: account.token });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const statusResponse = await fetch(`${graph}/${container.id}?fields=status_code&access_token=${encodeURIComponent(account.token)}`);
    const status = await statusResponse.json();
    if (status.status_code === 'FINISHED') break;
    if (status.status_code === 'ERROR' || status.error) throw new Error(status.error?.message || 'Instagram media processing failed.');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  const result = await metaPost(`${account.instagramUserId}/media_publish`, { creation_id: container.id, access_token: account.token });
  const mediaResponse = await fetch(`${graph}/${result.id}?fields=permalink&access_token=${encodeURIComponent(account.token)}`);
  const media = await mediaResponse.json();
  return { id: String(result.id), url: String(media?.permalink || `https://www.instagram.com/${account.instagramUsername || ''}`) };
}

async function publishPlatform(campaign: any, platform: 'facebook' | 'instagram', account: Awaited<ReturnType<typeof connection>>) {
  const pidPublication = `PUB${crypto.randomBytes(9).toString('hex').toUpperCase()}`;
  try {
    await prisma.social_publication.create({ data: { pidPublication, pidCampaign: campaign.pidCampaign, platform, status: 'pending' } });
  } catch { /* the unique campaign/platform record already exists */ }
  const current = await prisma.social_publication.findUnique({ where: { pidCampaign_platform: { pidCampaign: campaign.pidCampaign, platform } } });
  if (current?.status === 'published') return current;
  const lock = await prisma.social_publication.updateMany({
    where: { pidCampaign: campaign.pidCampaign, platform, status: { in: ['pending', 'failed'] }, attempts: { lt: 5 } },
    data: { status: 'processing', attempts: { increment: 1 }, lastError: null },
  });
  if (!lock.count) return current;
  try {
    const result = platform === 'facebook' ? await publishFacebook(campaign, account) : await publishInstagram(campaign, account);
    return await prisma.social_publication.update({
      where: { pidCampaign_platform: { pidCampaign: campaign.pidCampaign, platform } },
      data: { status: 'published', externalId: result.id, externalUrl: result.url, publishedAt: new Date(), lastError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publishing failed';
    await prisma.social_publication.update({ where: { pidCampaign_platform: { pidCampaign: campaign.pidCampaign, platform } }, data: { status: 'failed', lastError: message } });
    throw error;
  }
}

export async function publishSocialCampaign(pidCampaign: string) {
  const campaign = await prisma.social_campaign.findUnique({ where: { pidCampaign }, include: { publications: true } });
  if (!campaign || !campaign.designImageUrl) throw new Error('Campaign is missing its publishable design.');
  if (!['approved', 'partial', 'failed'].includes(campaign.status)) throw new Error('Campaign must be approved before publishing.');
  const account = await connection();
  const results = await Promise.allSettled([
    publishPlatform(campaign, 'facebook', account), publishPlatform(campaign, 'instagram', account),
  ]);
  const publications = await prisma.social_publication.findMany({ where: { pidCampaign } });
  const published = publications.filter((item) => item.status === 'published').length;
  const status = published === 2 ? 'published' : published === 1 ? 'partial' : 'failed';
  const failures = results.filter((item): item is PromiseRejectedResult => item.status === 'rejected').map((item) => item.reason instanceof Error ? item.reason.message : String(item.reason));
  await prisma.social_campaign.update({ where: { pidCampaign }, data: {
    status, publishedAt: status === 'published' ? new Date() : null, lastError: failures.join(' | ') || null,
  } });
  if (status === 'failed') throw new Error(failures.join(' | ') || 'Both platform publications failed.');
  return { status, publications };
}

export async function publishDueSocialCampaigns() {
  const due = await prisma.social_campaign.findMany({ where: { status: { in: ['approved', 'partial', 'failed'] }, scheduledFor: { lte: new Date() } }, orderBy: { scheduledFor: 'asc' }, take: 10 });
  const results = [];
  for (const campaign of due) {
    try { results.push({ pidCampaign: campaign.pidCampaign, ...(await publishSocialCampaign(campaign.pidCampaign)) }); }
    catch (error) { results.push({ pidCampaign: campaign.pidCampaign, status: 'failed', error: error instanceof Error ? error.message : String(error) }); }
  }
  return results;
}
