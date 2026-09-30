# Vehicle Pay Small Small — implementation and release

## Agreed policy

- Minimum deposit: 30% of the invoiced landed cost before the plan fee; configurable in Vehicles admin.
- Additional fee: 5% of that landed cost; configurable. Included once as an invoice line item.
- Duration: 180 days (six months); configurable from 1 to 365 days.
- Procurement and further fulfilment require the entire fee-inclusive invoice balance to be approved and the plan to be completed.
- The clock starts on the verified bank credit date that satisfies the minimum deposit. That activation date is retained once established, including after a payment reversal.
- Plan terms and Naira totals are saved with the offer. Settings changes affect new offers, not accepted plans.
- Extra payments satisfy the earliest remaining obligations. Schedules use 30-day intervals with a shorter final interval where necessary; the final due date never exceeds the agreed duration.
- Cancellation before procurement refunds 99.5% of net approved payments (a 0.5% deduction), including when the invoice was fully paid. Settlement is due within the configured period (initially seven business days) from the cancellation request, not reconciliation. Weekends and admin-maintained Nigerian public holidays are excluded. No automatic late charge or forfeiture.

## Included

Public vehicle detail pages offer the payment choice and preview when enabled. The choice survives sign-in. Customers accept the actual quoted terms before submitting bank proofs, see pending versus approved money, track instalments, and request cancellation from the vehicle dashboard. No Paystack payment route is used.

Vehicles admin contains configurable settings, a fixed-price approval acknowledgement, plan status and schedules, overdue/active/funded/review filters, and statement-confirmation fields. Finance records the actual amount, bank transaction identifier and credit date; incorrect claims must be corrected before approval. Database constraints prevent reuse of a registered vehicle bank credit, including when a bank account is renamed. Existing invoice references are also checked for collisions.

Cancellation freezes new payments and procurement. Previously submitted credits can still be reconciled while frozen. Refunds require cleared pending claims, the Paystack-validated profile bank account, an independently completed outgoing bank transfer and a different finance reviewer. This records a transfer; it does not initiate one.

Bank-credit reversal requests freeze the plan. A second finance reviewer confirms the bank reversal, appends a negative invoice payment, updates the net balance, records the audit trail and reopens payment collection. Original receipts remain in history; the customer proof list labels confirmed reversals. Fulfilment cannot advance while the balance is outstanding or the plan is under review.

Payment events use the existing vehicle notification outbox. Bounded reminder batches reuse the five-minute vehicle cron, deduplicate schedule reminders and skip reminders when pending claims cover the next obligation. The ordinary invoice reminder job excludes these plans. The offer acceptance/deposit deadline is separate from the invoice final payment date.

## Database and deployment order

The shared database now has both `20260930120000_vehicle_pay_small_small` and `20261001010000_vehicle_refund_bank_security` applied. Pay Small Small is enabled with 30% deposit, 5% fee, 180 days and seven refund business days. No code has been pushed or deployed for this implementation. The unrelated partner billing migration remains unapplied.

1. Obtain the user's deployment instruction. Review the outstanding changes in both repositories; the Ruichi quotation seed/source changes predate this feature and must be preserved.
2. Review migration status in both repositories against the shared database. The two feature migrations listed above are already applied; do not execute their SQL again. For a separate staging database, back up and apply both in order, checking for unrelated pending migrations. SQL is identical in both repositories.
3. Generate each Prisma client and deploy the matching admin and public code. The initial migration defaults enrolment to disabled, but the shared database was explicitly enabled by the user. The updated ordinary invoice reminder job requires this migration even while enrolment is disabled.
4. Verify a test customer and finance reviewers in a staging database before enabling production. Exercise request → quote → acceptance → split deposit → partial/extra payments → full payment → procurement, then cancellation/refund and bank reversal.
5. Confirm email/WhatsApp dispatch, cron authentication and provider delivery. Existing WhatsApp consent and templates still apply.
6. Enable Pay Small Small in Vehicles admin only after the paired release and finance verification. Current settings are 30%, 5%, 180 days.

Do not roll back to old approval/fulfilment code after accepting plans: that code does not understand plan holds. To stop new enrolment, disable the setting while continuing to serve existing plans; use a forward fix for financial workflow defects.

## Verification completed locally

- Public: 47 bank-security, calculation, request-handler, vehicle-commerce and search tests passed.
- Admin: 13 quotation, actual-credit verification, cancellation/refund and bank-reversal tests passed.
- Both TypeScript projects checked; both Prisma schemas validated; focused lint and diff checks run.
- Desktop/mobile customer components and admin settings visually checked, including dark theme and horizontal overflow. Temporary preview routes and server removed after checks.
- Handler tests use controlled transaction doubles. An isolated database could not be created with the available account, so a full staged bank/payment end-to-end run has **not** been verified. Both additive migrations were successfully applied to the shared database; tests mock Paystack and do not send real bank transfers. Do not treat the unit/handler checks as bank integration certification.

## Operational boundaries

Bank statement matching and outgoing refunds are manual finance operations. There is no bank feed, automatic debit, Paystack instalment checkout, or automatic supplier purchase. Overpayments, unknown bank credits and supplier-stage cancellations still require finance reconciliation; the customer-facing proof endpoint does not silently allocate excess money. The implementation does not invent plan extensions, financing after delivery, supplier reservation promises or additional penalties.

## Profile-bank and refund security update

- The legacy `/api/bank-details-update` endpoint returns 410 and cannot write bank details.
- The two profile-bank routes derive identity and email from the signed-in session and require same-origin requests. Client-supplied identity is ignored.
- Cryptographically random six-digit email codes are hashed with a server secret, expire after ten minutes, are bound to the chosen bank/account, allow five attempts, and are consumed once. Resends have a one-minute cooldown and five-per-hour cap. Codes are never logged; failed email delivery is reported and the code invalidated.
- The update route resolves the account server-side with Paystack, uses the returned name, and requires a matching transfer recipient. Paystack failure saves no new profile bank details. See [Paystack account resolution](https://paystack.com/docs/api/verification/) and [transfer recipients](https://paystack.com/docs/api/transfer-recipient/).
- A verification fingerprint binds the saved bank/account/name/recipient to the completed flow. Older accounts must be re-verified through Profile → Bank Details before a vehicle refund; no legacy account was automatically marked verified.
- Admin cannot supply another destination. Refund proposal loads the verified profile account, and the second reviewer’s confirmation checks it still matches. Profile bank changes are blocked while a vehicle refund transfer is pending.
- Gross approved payments, the 0.5% deduction, net refund, original request time and deadline are saved. Repeated cancellation requests and later settings changes cannot reset the deadline. The customer explicitly accepts the cancellation deduction.
- Maintain announced Nigerian public holidays in Vehicles admin; no unverified holiday calendar was seeded. Actual bank settlement remains manual and two-person reviewed.
- These source-code protections require deployment of both repositories to protect production routes; applying the additive schema alone does not patch old deployed endpoints.
