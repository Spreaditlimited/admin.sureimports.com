# Admin affiliate workspace

Entry: `/dashboard/affiliates` → affiliate name → referral name/reference.

## Coverage

- Affiliate identity, status, consent, current/alias codes and payout-setup status.
- Only permanently linked customer references appear as referrals in Admin; anonymous visits are excluded from lists, counts and detail URLs. Affiliate dashboards show a separately labelled link-visit count.
- Currency/status-separated commission summaries; no combined currency total.
- Commission purchase basis, release timing, reversal information, refund adjustments and payout linkage.
- Payout/provider outcomes, included commissions, owned shipping requests and email delivery history.
- Referral payment register (`payments`), historical `payment_records`, invoice payments and claims, bank submissions, refund requests and settlement records.
- LineScout payments/events read from the central ledger using the exact `linescout:` customer reference. Names/emails are not guessed across systems.
- Scoped search, bounded pagination, loading/error/empty states and shared Admin light/dark theme tokens.

## Safety and interpretation

- Read-only. No new mutation, payment execution, record creation or migration.
- Every page requires existing `payout_requests` view access before queries; referral routes additionally match both affiliate and referral IDs.
- An unclaimed visitor never triggers a customer-payment query.
- Older/payment/invoice records can overlap. Registers are labelled separately and never summed into a fabricated revenue total.
- Customer history can predate attribution and include ineligible purchases. Only linked conversion records represent affiliate commissions.
- No auth secrets, unmasked payout destinations or raw provider payloads are selected for display.
- LineScout refunds/reversals appear with the original ledger payment and commission adjustments. The 10 most recent provider events are shown per payment and explicitly labelled when truncated.

## Verification (2026-09-14)

- `node --test tests/affiliate-admin-visibility.test.mjs tests/admin-access-ledger.test.mjs`: 25 passing checks.
- `npx tsc --noEmit --incremental false` and targeted ESLint: passed.
- Isolated production build: passed (running dev-server cache untouched).
- Read-only database smoke: 10 rendered screens using existing LineScout referrals plus 6 native-customer empty-state renders against actual tables; 85 reads, zero writes.
- Synthetic browser verification: desktop/mobile, light/dark, disclosure interaction and page overflow.

## Prisma schema repair

The missing `procurement_partner_customer_orders` parent model is now mapped in Admin, including its adjustment and fee relations. Validation and client regeneration pass with the existing environment loaded. This is a mapping of an existing database table, not a migration or data reset.

Nothing deployed.
