// Reconciles only explicit, active consent from the shared marketing ledger.
// Run with --env-file=.env.local and a TypeScript loader. Never sends email.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: [] });
(globalThis as unknown as { prisma: typeof prisma }).prisma = prisma;
try {
  const { verifyBrevoMarketing } = require('../lib/marketing/brevoClient.ts');
  const { reconcileBrevoMarketingContacts } = require('../lib/marketing/brevoContacts.ts');
  await verifyBrevoMarketing();
  const result = await reconcileBrevoMarketingContacts();
  console.log(JSON.stringify(result));
  if (result.failed) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
