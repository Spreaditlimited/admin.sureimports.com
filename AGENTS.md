<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Sure Imports: Git-only deployments (standing owner rule, 27 October 2026)

- Every production and preview code deployment for Sure Imports and every Sure Imports subdomain/repository MUST originate from committed code pushed to Git and the hosting provider's Git integration. This includes the main website, admin, partner, affiliate, LineScout and related applications.
- Never deploy an uncommitted working tree. Do not use `vercel deploy`, `vercel --prod`, CLI redeployment/promotion, or any equivalent direct source-upload deployment. Vercel CLI may be used for read-only inspection, logs and verification.
- Before a release, inspect the currently deployed source, deployment method and commit. Reconcile and preserve any live CLI-only or uncommitted changes in Git before introducing the new change. Do not assume the repository HEAD contains everything previously deployed.
- Commit all intended application changes, run the relevant checks, push the intended deployment branch, and verify that the resulting deployment reports Git as its source and the exact pushed commit SHA. Rollbacks must also use Git changes.
- Preserve unrelated work. Keep credentials, environment files and private operational exports out of public Git history.
