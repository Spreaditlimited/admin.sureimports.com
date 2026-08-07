import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getReportPricing, updateReportPricing } from '@/lib/intelligence/reportPricing';
import { requireAdmin, unauthorized } from '../../invoicing/_lib/invoicing';

type PlanKey = 'starter' | 'pro';

type PlanSetting = {
  id: number;
  pidSetting: string;
  planKey: PlanKey;
  name: string;
  priceNaira: number;
  paystackPlanCode: string | null;
  monthlySearchCredits: number;
  extraCreditPriceNaira: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

const defaultPlans: Record<PlanKey, Omit<PlanSetting, 'id' | 'createdAt' | 'updatedAt'>> = {
  starter: {
    pidSetting: 'INTELLIGENCE-PLAN-STARTER',
    planKey: 'starter',
    name: 'Starter Database',
    priceNaira: 10000,
    paystackPlanCode: process.env.PAYSTACK_INTELLIGENCE_STARTER_PLAN_CODE || null,
    monthlySearchCredits: 1,
    extraCreditPriceNaira: 5000,
    status: 'ACTIVE',
  },
  pro: {
    pidSetting: 'INTELLIGENCE-PLAN-PRO',
    planKey: 'pro',
    name: 'Pro Review Support',
    priceNaira: 25000,
    paystackPlanCode: process.env.PAYSTACK_INTELLIGENCE_PRO_PLAN_CODE || null,
    monthlySearchCredits: 3,
    extraCreditPriceNaira: 5000,
    status: 'ACTIVE',
  },
};

function clean(value: unknown, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function normalizePrice(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

async function ensurePlanSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS intelligence_plan_settings (
      id INT NOT NULL AUTO_INCREMENT,
      pidSetting VARCHAR(80) NOT NULL,
      planKey VARCHAR(40) NOT NULL,
      name VARCHAR(120) NOT NULL,
      priceNaira INT NOT NULL,
      paystackPlanCode VARCHAR(160) NULL,
      monthlySearchCredits INT NOT NULL DEFAULT 0,
      extraCreditPriceNaira INT NOT NULL DEFAULT 5000,
      status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY intelligence_plan_settings_pid_key (pidSetting),
      UNIQUE KEY intelligence_plan_settings_plan_key (planKey),
      KEY intelligence_plan_settings_status_idx (status),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);

  for (const statement of [
    'ALTER TABLE intelligence_plan_settings ADD COLUMN monthlySearchCredits INT NOT NULL DEFAULT 0',
    'ALTER TABLE intelligence_plan_settings ADD COLUMN extraCreditPriceNaira INT NOT NULL DEFAULT 5000',
  ]) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch {
      // Existing databases may already have these columns.
    }
  }
}

async function seedDefaultPlans() {
  for (const plan of Object.values(defaultPlans)) {
    await prisma.$executeRaw`
      INSERT INTO intelligence_plan_settings (
        pidSetting,
        planKey,
        name,
        priceNaira,
        paystackPlanCode,
        monthlySearchCredits,
        extraCreditPriceNaira,
        status
      ) VALUES (
        ${plan.pidSetting},
        ${plan.planKey},
        ${plan.name},
        ${plan.priceNaira},
        ${plan.paystackPlanCode},
        ${plan.monthlySearchCredits},
        ${plan.extraCreditPriceNaira},
        'ACTIVE'
      )
      ON DUPLICATE KEY UPDATE
        monthlySearchCredits = COALESCE(monthlySearchCredits, ${plan.monthlySearchCredits}),
        extraCreditPriceNaira = COALESCE(extraCreditPriceNaira, ${plan.extraCreditPriceNaira}),
        status = 'ACTIVE'
    `;
  }
}

async function getPlanSettings() {
  await ensurePlanSettingsTable();
  await seedDefaultPlans();

  return prisma.$queryRaw<PlanSetting[]>`
    SELECT
      id,
      pidSetting,
      planKey,
      name,
      priceNaira,
      paystackPlanCode,
      CASE
        WHEN planKey = 'starter' AND monthlySearchCredits = 0 THEN 1
        WHEN planKey = 'pro' AND monthlySearchCredits = 0 THEN 3
        ELSE monthlySearchCredits
      END AS monthlySearchCredits,
      CASE
        WHEN extraCreditPriceNaira = 0 THEN 5000
        ELSE extraCreditPriceNaira
      END AS extraCreditPriceNaira,
      status,
      createdAt,
      updatedAt
    FROM intelligence_plan_settings
    WHERE planKey IN ('starter', 'pro')
    ORDER BY FIELD(planKey, 'starter', 'pro')
  `;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const [plans, reportPricing] = await Promise.all([
      getPlanSettings(),
      getReportPricing(),
    ]);
    return NextResponse.json({ statusx: 'SUCCESS', data: plans, reportPricing });
  } catch (error: any) {
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: 'Failed to fetch Supplier Intelligence plan settings.',
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    await ensurePlanSettingsTable();
    await seedDefaultPlans();

    const body = await request.json().catch(() => ({}));
    const plans = Array.isArray(body?.plans) ? body.plans : [];
    const currentReportPricing = await getReportPricing();
    const reportPriceNaira = normalizePrice(
      body?.reportPricing?.priceNaira ?? currentReportPricing.priceNaira,
    );
    const reportPriceUsdCents = normalizePrice(
      body?.reportPricing?.priceUsdCents ?? currentReportPricing.priceUsdCents,
    );

    if (reportPriceNaira < 1000 || reportPriceUsdCents < 100) {
      return NextResponse.json(
        {
          statusx: 'ERROR',
          message: 'Manufacturer reports require valid NGN and USD prices.',
        },
        { status: 400 },
      );
    }

    for (const item of plans) {
      const planKey = item?.planKey === 'pro' ? 'pro' : item?.planKey === 'starter' ? 'starter' : null;
      if (!planKey) continue;

      const name = clean(item.name, 120);
      const priceNaira = normalizePrice(item.priceNaira);
      const paystackPlanCode = clean(item.paystackPlanCode, 160) || null;
      const monthlySearchCredits = Math.max(
        0,
        Math.round(Number(item.monthlySearchCredits || 0)),
      );
      const extraCreditPriceNaira = normalizePrice(item.extraCreditPriceNaira);

      if (!name || priceNaira < 1000) {
        return NextResponse.json(
          {
            statusx: 'ERROR',
            message: 'Each plan requires a name and price of at least NGN 1,000.',
          },
          { status: 400 },
        );
      }

      await prisma.$executeRaw`
        UPDATE intelligence_plan_settings
        SET
          name = ${name},
          priceNaira = ${priceNaira},
          paystackPlanCode = ${paystackPlanCode},
          monthlySearchCredits = ${monthlySearchCredits},
          extraCreditPriceNaira = ${extraCreditPriceNaira},
          status = 'ACTIVE',
          updatedAt = ${new Date()}
        WHERE planKey = ${planKey}
      `;
    }

    const reportPricing = await updateReportPricing({
      priceNaira: reportPriceNaira,
      priceUsdCents: reportPriceUsdCents,
    });
    return NextResponse.json({
      statusx: 'SUCCESS',
      data: await getPlanSettings(),
      reportPricing,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: 'Failed to update Supplier Intelligence plan settings.',
        error: error.message,
      },
      { status: 500 },
    );
  }
}
