import crypto from 'crypto';
import { NextResponse } from 'next/server';

import { getSocialAdmin } from '@/lib/social/auth';
import { adminBaseUrl, META_GRAPH_VERSION, SOCIAL_STUDIO_ENABLED } from '@/lib/social/config';

export async function GET() {
  const admin = await getSocialAdmin('edit');
  if (!admin) return NextResponse.redirect(`${adminBaseUrl()}/dashboard`);
  if (!SOCIAL_STUDIO_ENABLED) return NextResponse.redirect(`${adminBaseUrl()}/dashboard/social-studio?meta=studio_paused`);
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) return NextResponse.redirect(`${adminBaseUrl()}/dashboard/social-studio?meta=missing_config`);
  const state = crypto.randomBytes(24).toString('hex');
  const callback = `${adminBaseUrl()}/api/social/meta/callback`;
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID, redirect_uri: callback, state, response_type: 'code',
    scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish',
  });
  const response = NextResponse.redirect(`https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params}`);
  response.cookies.set('social_meta_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  return response;
}
