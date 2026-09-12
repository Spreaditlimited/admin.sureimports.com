# Partner business-fit review

## Approval stages and notifications

The admin application queue identifies the next stage, with per-page search and filters. The selected business stays open after a review is saved. Returning to the queue preserves its filter, scroll position and keyboard focus.

1. **Business fit** assesses the business plan. Pilot approval completes this stage only. Requesting clarification returns the application to draft for corrections and resubmission.
2. **Business verification** checks registration, identity and ownership evidence. Acceptance does not activate the business.
3. **Final approval** requires both reviews, the agreement and the transactional membership checks. It activates the business, while storefront publication and payment collection remain separate.

All three decision stages queue a notification to the owner's sign-in email. Admin attempts delivery after the response, without making SMTP part of the approval transaction. The partner scheduler retries queued failures using the same lease protocol. Notification status is visible in the admin review. `SENT` means SMTP acceptance, not confirmed inbox delivery. Keep admin and partner `email-policy.ts` content aligned.

The obsolete rollout-wide activation block is lifted; KYC, business fit, agreement, country/currency, stale-revision and affiliate-membership checks remain enforced. No business is activated simply because this flag changed.

Opening a submitted application in Partner Applications starts automatic analysis of its eight business-readiness answers. The score is advisory: no KYC decision, business approval, activation or payment setting is changed.

## Rubric

Each area is scored from 0–5, then weighted on the server:

| Area | Weight |
| --- | --- |
| Relevant customer access | 30% |
| Customer acquisition plan | 25% |
| Operational readiness | 25% |
| Sales experience or demand | 10% |
| Partnership understanding | 10% |

Scores describe specificity and coherence of self-reported answers, not independently verified evidence. The UI shows reasons, source answer names, concerns and follow-up questions. A score of 75+ suggests considering a pilot; 55–74 suggests clarification; below 55 suggests more preparation. These are not automatic decisions.

Admin can edit scores. An assessment arriving after manual edits never overwrites those edits. Previously saved manual scores are retained. Admin must choose the decision and independently complete the required checks. Automatic and final manual scores are retained together in the encrypted review/audit history.

## Standard responses

Each text-review field offers positive findings and concerns/corrections under **Add a standard response**. Clicking adds text without replacing existing notes. Admin can edit or remove it, and duplicate suggestions are disabled. Suggestions never choose a decision or tick a verification checkbox. Only insert statements that match the actual review. Replace generic prompts with real evidence references and measurable pilot targets.

## Runtime and safety

- Uses the existing admin `OPENAI_API_KEY`. Optional `PARTNER_FIT_MODEL` overrides `SOCIAL_TEXT_MODEL`; otherwise the existing default `gpt-5.6-terra` is used.
- Only the eight readiness answers are sent. Founder identities, KYC documents, bank details and other application fields are excluded. Free-text answers can still contain information the applicant volunteered.
- Uses structured output validation, a fixed rubric, no tools/link visits and `store: false`. Treats answer text as untrusted data, not instructions. Human reviewers must still check for inaccurate assessments.
- Only same-origin requests from authorised partner reviewers can trigger scoring. Answers are loaded from the database, not accepted from the caller.
- Results are cached by answer hash, model and rubric version. A database-backed lease prevents duplicate generation across concurrent reviewers. Provider requests run outside transactions and time out after 45 seconds.
- Concurrent manual changes invalidate an in-flight result. Failure retains manual review access, shows an error and imposes a one-minute retry cooldown.
- Storage uses the existing encrypted review JSON and audit events. No additional database migration is required.
- Assessments run when the review is opened, not as a background job at application submission.

## Verification

Run `node --experimental-strip-types --test tests/partner-business-fit.test.mjs` for isolated checks with mocked database/provider adapters. No production records are created or changed by these tests.

Provider implementation follows the [OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs).
