# Sure Imports Admin Social Studio

Social Studio lives exclusively in `admin.sureimports.com` at `/dashboard/social-studio`. It generates one demand-led 1080 × 1080 campaign per day, emails `hello@sureimports.com`, and publishes only after an authorised admin approves it.

## Schedule and editorial contract

- Draft generation: 4:00 PM WAT daily (`15:00 UTC`), ready for the following day.
- Publication: 10:00 AM WAT daily (`09:00 UTC`), seven days a week.
- Weekly mix: four educational and three bottom-of-funnel campaign slots.
- Sources: published Sure Imports blogs and relevant service pages.
- Instagram and Facebook captions are independently written and contain 100–200 words each.
- Prices, currency amounts, discounts, invented statistics and unsupported guarantees are blocked.
- WhatsApp is included only where relevant and always labelled `WhatsApp only: +234 803 764 9956`.
- No approval means no publication.

## Required Vercel variables

```env
SOCIAL_APPROVAL_EMAIL=hello@sureimports.com
SOCIAL_TOKEN_ENCRYPTION_KEY=<random secret of at least 24 characters>

META_APP_ID=<Meta app ID>
META_APP_SECRET=<Meta app secret>
META_GRAPH_VERSION=v25.0
# Optional when the Meta account administers several Pages:
META_PAGE_ID=<Sure Imports Facebook Page ID>

SOCIAL_TEXT_MODEL=gpt-5.6-terra
SOCIAL_IMAGE_MODEL=gpt-image-2

OPENAI_API_KEY=<already configured>
CLOUDINARY_CLOUD_NAME=<already configured>
CLOUDINARY_API_KEY=<already configured>
CLOUDINARY_API_SECRET=<already configured>
CRON_SECRET=<secure random value>
NEXT_PUBLIC_SITE_URL=https://admin.sureimports.com
```

Never expose Meta, OpenAI, Cloudinary, encryption or access-token secrets in client-side variables or chat.

## Database and deployment

Run before opening Social Studio:

```bash
npx prisma migrate deploy
```

The migration is `prisma/migrations/20260804173000_add_social_studio/migration.sql`.

## Meta application

1. Create or select the Sure Imports Meta Business application.
2. Configure Facebook Login and add this exact OAuth redirect URI:
   `https://admin.sureimports.com/api/social/meta/callback`
3. Enable or request:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic`
   - `instagram_content_publish`
4. Add the app credentials to Vercel and redeploy.
5. Sign in to the admin app as a super admin or an admin with `social_studio` edit permission.
6. Open `/dashboard/social-studio`, select **Connect Meta**, and grant access to the Sure Imports Facebook Page and its connected `@sureimport` Business account.

Meta may require Business Verification and advanced permission review before people outside the app-role list can use production OAuth.

## Go-live checklist

1. Confirm the two social cron routes appear in Vercel.
2. Generate one draft manually.
3. Confirm the image is square and both captions contain 100–200 words with no price.
4. Approve the campaign.
5. Use **Publish now** while the Meta app is limited to app-role users.
6. Confirm both platform links appear in Social Studio.
7. Leave the daily schedule enabled only after the test succeeds.
