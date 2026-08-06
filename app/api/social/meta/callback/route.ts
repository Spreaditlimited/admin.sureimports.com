import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getSocialAdmin } from '@/lib/social/auth';
import { adminBaseUrl, META_GRAPH_VERSION, SOCIAL_STUDIO_ENABLED, SURE_IMPORTS_INSTAGRAM } from '@/lib/social/config';
import { encryptSocialToken } from '@/lib/social/crypto';
import { prisma } from '@/lib/prisma';

const graph = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
function studio(status: string) { return NextResponse.redirect(`${adminBaseUrl()}/dashboard/social-studio?meta=${encodeURIComponent(status)}`); }

export async function GET(request: Request) {
  if (!SOCIAL_STUDIO_ENABLED) return studio('studio_paused');
  const admin = await getSocialAdmin('edit');
  if (!admin) return studio('unauthorized');
  const url = new URL(request.url); const code = url.searchParams.get('code'); const state = url.searchParams.get('state');
  const cookieStore = await cookies(); const expectedState = cookieStore.get('social_meta_oauth_state')?.value;
  if (!code || !state || !expectedState || state !== expectedState) return studio('invalid_state');
  try {
    const callback = `${adminBaseUrl()}/api/social/meta/callback`;
    const tokenResponse = await fetch(`${graph}/oauth/access_token?${new URLSearchParams({ client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET!, redirect_uri: callback, code })}`);
    const shortToken = await tokenResponse.json();
    if (!tokenResponse.ok || !shortToken.access_token) throw new Error(shortToken.error?.message || 'Could not exchange Meta code.');
    const longResponse = await fetch(`${graph}/oauth/access_token?${new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET!, fb_exchange_token: shortToken.access_token })}`);
    const longToken = await longResponse.json();
    if (!longResponse.ok || !longToken.access_token) throw new Error(longToken.error?.message || 'Could not obtain long-lived Meta token.');
    const pagesResponse = await fetch(`${graph}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100&access_token=${encodeURIComponent(longToken.access_token)}`);
    const pages = await pagesResponse.json();
    if (!pagesResponse.ok) throw new Error(pages.error?.message || 'Could not list Facebook Pages.');
    const requiredPageId = process.env.META_PAGE_ID?.trim();
    const page = pages.data?.find((item: any) => requiredPageId ? item.id === requiredPageId : item.instagram_business_account?.username?.toLowerCase() === SURE_IMPORTS_INSTAGRAM);
    if (!page?.access_token || !page?.instagram_business_account?.id) throw new Error(`No Facebook Page connected to @${SURE_IMPORTS_INSTAGRAM} was found.`);
    const data = { status: 'active', accountName: page.name, accountId: page.id, pageId: page.id, instagramUserId: page.instagram_business_account.id, instagramUsername: page.instagram_business_account.username, encryptedAccessToken: encryptSocialToken(page.access_token), tokenExpiresAt: longToken.expires_in ? new Date(Date.now() + Number(longToken.expires_in) * 1000) : null, connectedBy: admin.pidUser, lastVerifiedAt: new Date() };
    await prisma.social_connection.upsert({ where: { platform: 'meta' }, create: { platform: 'meta', ...data }, update: data });
    const response = studio('connected'); response.cookies.delete('social_meta_oauth_state'); return response;
  } catch (error) {
    console.error('Meta OAuth callback failed:', error);
    return studio(error instanceof Error ? error.message : 'connection_failed');
  }
}
