# Supplier Intelligence Reports

Supplier Intelligence Reports are one-time, category-specific digital products managed from `admin.sureimports.com` and sold on `sureimports.com`.

Buyer-facing language and research evidence must follow [SUPPLIER_INTELLIGENCE_EDITORIAL_STANDARD.md](./SUPPLIER_INTELLIGENCE_EDITORIAL_STANDARD.md).

## Admin workflow

1. Open **Supplier Intel → Reports**.
2. Select a published supplier category.
3. Enter the NGN price for Paystack and USD price for PayPal.
4. Create the report product.
5. Edit the title, subtitle, sales description or edition label if necessary.
6. Generate a new edition. Generation snapshots the currently approved suppliers and uploads the finished PDF to Cloudinary.
7. Open **Preview PDF** and review the document.
8. Publish the selected edition.

Draft report products and unpublished generated editions can be permanently deleted from the Reports dashboard. Deletion also removes their Cloudinary PDF assets. Published editions and any report or edition with checkout or purchase records are protected from deletion.

Publishing supersedes the previous public edition but does not change files already purchased. Each order remains attached to the version bought by that customer.

## Customer routes

- Main Supplier Intelligence page: `/supplier-intelligence`
- Reports catalogue: `/supplier-intelligence/reports`
- Report sales page: `/supplier-intelligence/reports/[slug]`
- Customer library: `/dashboard/intelligence/reports`

Nigeria is routed to Paystack in NGN. Every other billing country is routed to PayPal in USD. The country selected at checkout is used instead of IP-based assumptions.

## Required environment variables

### Public application

- `DATABASE_URL`
- `NEXT_SECRET_PAYSTACK_SECRET_KEY`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID` (Production uses the webhook registered for `https://www.sureimports.com/api/intelligence/paypal-webhook`.)
- `SMTP_EMAIL`
- `SMTP_PASSWORD`
- `JWT_SECRET`
- `NEXT_PUBLIC_SITE_URL` or the production fallback `https://www.sureimports.com`

### Admin application

- `DATABASE_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Payment and delivery behaviour

- The server loads the price from the published product; the browser cannot submit an amount.
- The purchased edition is fixed before checkout starts.
- Paystack and PayPal amounts, currencies and references are verified before fulfilment.
- Webhooks provide fulfilment when a customer closes the callback page.
- Fulfilment is idempotent to prevent duplicate email delivery.
- The customer receives a tokenised Sure Imports download URL. The Cloudinary storage URL is fetched server-side and is not used as the customer download link.
- Refunded PayPal orders lose download access.
