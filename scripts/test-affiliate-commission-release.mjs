import { randomBytes, createHash } from 'node:crypto';
import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');

const prisma = new PrismaClient();
const cronSecret = process.env.CRON_SECRET;
const baseUrl = (process.env.ADMIN_TEST_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const suffix = randomBytes(6).toString('hex');
const automaticKey = `E2E_AUTO_${suffix.toUpperCase()}`;
const manualKey = `E2E_MANUAL_${suffix.toUpperCase()}`;
const automaticPid = `afsvc_e2e_auto_${suffix}`;
const manualPid = `afsvc_e2e_manual_${suffix}`;
const automaticConversionPid = `afconv_e2e_auto_${suffix}`;
const manualConversionPid = `afconv_e2e_manual_${suffix}`;
const emailEventKey = `commission:available:${automaticConversionPid}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function cleanup() {
  await prisma.affiliate_email_events.deleteMany({ where: { eventKey: emailEventKey } });
  await prisma.affiliate_conversions.deleteMany({ where: { pidConversion: { in: [automaticConversionPid, manualConversionPid] } } });
  await prisma.affiliate_program_services.deleteMany({ where: { serviceKey: { in: [automaticKey, manualKey] } } });
}

async function main() {
  assert(cronSecret, 'CRON_SECRET is required for this test.');
  const affiliate = await prisma.affiliate_accounts.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } });
  assert(affiliate, 'An active affiliate account is required for this isolated lifecycle test.');
  const unrelatedEligible = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) AS count
    FROM affiliate_conversions conversion
    WHERE conversion.status = 'PENDING'
      AND conversion.releaseMode = 'AUTOMATIC'
      AND conversion.releaseAt <= NOW(3)
  `);
  assert(Number(unrelatedEligible[0]?.count || 0) === 0, 'Refusing to run while unrelated commissions are eligible for automatic release.');

  await cleanup();
  const [automaticService, manualService] = await Promise.all([
    prisma.affiliate_program_services.create({ data: { pidService: automaticPid, serviceKey: automaticKey, displayName: 'E2E automatic release', commissionType: 'FIXED', eligibleAmountBasis: 'QUALIFYING_PAYMENT', approvalMode: 'AUTOMATIC', reviewPeriodDays: 1, active: false } }),
    prisma.affiliate_program_services.create({ data: { pidService: manualPid, serviceKey: manualKey, displayName: 'E2E manual review', commissionType: 'FIXED', eligibleAmountBasis: 'QUALIFYING_PAYMENT', approvalMode: 'MANUAL', reviewPeriodDays: 0, active: false } }),
  ]);
  const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  await prisma.affiliate_conversions.createMany({ data: [
    { pidConversion: automaticConversionPid, affiliateId: affiliate.id, serviceId: automaticService.id, externalOrderReference: `e2e-auto-${suffix}`, paymentCurrency: 'NGN', grossAmount: 1000, eligibleAmount: 1000, commissionCurrency: 'NGN', commissionAmount: 100, status: 'PENDING', releaseMode: 'AUTOMATIC', releaseAt: new Date(Date.now() - 60_000), createdAt },
    { pidConversion: manualConversionPid, affiliateId: affiliate.id, serviceId: manualService.id, externalOrderReference: `e2e-manual-${suffix}`, paymentCurrency: 'NGN', grossAmount: 1000, eligibleAmount: 1000, commissionCurrency: 'NGN', commissionAmount: 100, status: 'PENDING', releaseMode: 'MANUAL', releaseAt: null, createdAt },
  ] });
  await prisma.affiliate_email_events.create({ data: {
    pidEvent: `aemail_e2e_${suffix}`,
    eventKey: emailEventKey,
    eventType: 'COMMISSION_AVAILABLE',
    recipientHash: createHash('sha256').update(`e2e:${suffix}`).digest('hex'),
    status: 'SENT',
    attempts: 1,
    sentAt: new Date(),
  } });

  const run = () => fetch(`${baseUrl}/api/cron/affiliate-commission-release?limit=25`, { headers: { authorization: `Bearer ${cronSecret}` } });
  const firstResponse = await run();
  const first = await firstResponse.json();
  assert(firstResponse.ok, `First release run failed: ${JSON.stringify(first)}`);
  assert(first.released === 1, `Expected one release, received ${first.released}.`);
  const afterFirst = await prisma.affiliate_conversions.findMany({ where: { pidConversion: { in: [automaticConversionPid, manualConversionPid] } }, select: { pidConversion: true, status: true, approvedAt: true, availableAt: true } });
  const automatic = afterFirst.find((row) => row.pidConversion === automaticConversionPid);
  const manual = afterFirst.find((row) => row.pidConversion === manualConversionPid);
  assert(automatic?.status === 'AVAILABLE' && automatic.approvedAt && automatic.availableAt, 'Mature automatic commission was not released.');
  assert(manual?.status === 'PENDING' && !manual.approvedAt && !manual.availableAt, 'Manual-review commission was changed.');

  const secondResponse = await run();
  const second = await secondResponse.json();
  assert(secondResponse.ok, `Second release run failed: ${JSON.stringify(second)}`);
  assert(second.released === 0, `Idempotency failed; second run released ${second.released}.`);
  console.log(JSON.stringify({ ok: true, firstRun: first, secondRun: second, automaticStatus: automatic.status, manualStatus: manual.status }, null, 2));
}

main()
  .finally(cleanup)
  .finally(() => prisma.$disconnect());
