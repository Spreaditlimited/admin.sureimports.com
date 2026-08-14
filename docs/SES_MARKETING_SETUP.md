# Amazon SES marketing email

The marketing email system is intentionally sandbox-first. Existing Flodesk contacts
remain there, but new accounts and opt-ins from the fixed cutover are owned only by SES.

## Safety model

- The default mode is `sandbox`, even when no environment variable is present.
- Sandbox sends are restricted to accounts registered on or after the fixed marketing
  cutover (14 August 2026). Pre-cutover customers remain Flodesk-owned.
- An address must also be verified as an SES identity before AWS will accept a send.
- Address verification is initiated manually from Email Operations and emails the customer;
  it is never triggered merely because an account was recently registered.
- Sandbox test contacts are recorded as `TEST_ONLY`, not as marketing consent.
- Bounce, complaint and opt-out events suppress later sends in the local contact ledger.
- Production requires both `SES_MARKETING_MODE=production` and
  `SES_PRODUCTION_SENDS_ENABLED=true`. Setting only one does not enable it.

## Runtime variables

```text
MARKETING_AWS_REGION=eu-west-1
AWS_ROLE_ARN=<Vercel OIDC IAM role ARN>
SES_MARKETING_CONFIGURATION_SET=sureimports-marketing
SES_MARKETING_CONTACT_LIST=sureimports-marketing
SES_MARKETING_DEFAULT_TOPIC=general-insights
SES_MARKETING_FROM_EMAIL=hello@mail.sureimports.com
SES_MARKETING_FROM_NAME=Sure Imports
SES_MARKETING_REPLY_TO=hello@sureimports.com
SES_MARKETING_EVENT_QUEUE_URL=https://sqs.eu-west-1.amazonaws.com/267811820256/sureimports-marketing-events
SES_MARKETING_CUTOVER_AT=2026-08-13T23:00:00.000Z
SES_SANDBOX_ALLOWED_RECIPIENTS=<optional comma-separated internal addresses>
CRON_SECRET=<random secret shared with the event-processing cron>
```

Local AWS SDK calls may use the existing profile by starting the app with
`AWS_PROFILE=sureimports-admin`. Vercel should use OIDC through `AWS_ROLE_ARN`; long-lived
AWS access keys should not be stored in Vercel.

## Operations

- Admin page: `/dashboard/marketing/email`
- Import/refresh the source sequence: `npm run seed:marketing-email`
- Event cron: `GET /api/cron/marketing-events` with `Authorization: Bearer <CRON_SECRET>`
- Manual event processing and sandbox test sends are available on the admin page.

The imported sequence remains `DRAFT`. Importing or refreshing content does not activate
the sequence and does not email anybody.
