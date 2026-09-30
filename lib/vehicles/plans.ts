import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PLAN_SETTINGS,
  type PlanSettings,
  type VehiclePlan,
} from "./installments";
type DB = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;
function missingTable(e: unknown) {
  const err = e as { code?: string; meta?: { code?: string } };
  return (
    err.code === "P2021" || (err.code === "P2010" && err.meta?.code === "1146")
  );
}
export async function getPlanSettings(db: DB = prisma): Promise<PlanSettings> {
  try {
    const rows = await db.$queryRaw<
      {
        enabled: boolean;
        depositPercent: string;
        feePercent: string;
        durationDays: number;
        refundBusinessDays: number;
        refundHolidays: string[] | string | null;
        revision: number;
      }[]
    >`SELECT enabled,depositPercent,feePercent,durationDays,revision,refundBusinessDays,refundHolidays FROM vehicle_plan_settings WHERE id=1`;
    const r = rows[0];
    return r
      ? {
          enabled: !!r.enabled,
          depositPercent: Number(r.depositPercent),
          feePercent: Number(r.feePercent),
          durationDays: r.durationDays,
          revision: r.revision,
          refundBusinessDays: r.refundBusinessDays,
          refundHolidays:
            typeof r.refundHolidays === "string"
              ? JSON.parse(r.refundHolidays)
              : r.refundHolidays || [],
        }
      : DEFAULT_PLAN_SETTINGS;
  } catch (e) {
    if (missingTable(e)) return DEFAULT_PLAN_SETTINGS;
    throw e;
  }
}
export async function getVehiclePlans(
  orderIds: string[],
  db: DB = prisma,
): Promise<VehiclePlan[]> {
  if (!orderIds.length) return [];
  try {
    const rows = await db.$queryRaw<
      (Omit<
        VehiclePlan,
        | "acceptedAt"
        | "activatedAt"
        | "expiresAt"
        | "cancellationRequestedAt"
        | "refundDueAt"
      > & {
        cancellationRequestedAt: Date | null;
        refundDueAt: Date | null;
        acceptedAt: Date | null;
        activatedAt: Date | null;
        expiresAt: Date | null;
      })[]
    >`SELECT orderId,status,terms,acceptedAt,activatedAt,expiresAt,cancellationReason,refundProposedBy,CAST(refundMinor AS CHAR) AS refundMinor,refundAccount,refundReference,cancellationRequestedAt,refundDueAt,refundBusinessDays,CAST(refundGrossMinor AS CHAR) AS refundGrossMinor,CAST(refundFeeMinor AS CHAR) AS refundFeeMinor,refundBankFingerprint FROM vehicle_payment_plans WHERE orderId IN (${Prisma.join(orderIds)})`;
    return rows.map((p) => ({
      ...p,
      terms: typeof p.terms === "string" ? JSON.parse(p.terms) : p.terms,
      cancellationRequestedAt: p.cancellationRequestedAt?.toISOString() || null,
      refundDueAt: p.refundDueAt?.toISOString() || null,
      acceptedAt: p.acceptedAt?.toISOString() || null,
      activatedAt: p.activatedAt?.toISOString() || null,
      expiresAt: p.expiresAt?.toISOString() || null,
    }));
  } catch (e) {
    if (missingTable(e)) return [];
    throw e;
  }
}
export async function getVehiclePlan(
  orderId: string,
  db: DB = prisma,
): Promise<VehiclePlan | null> {
  return (await getVehiclePlans([orderId], db))[0] || null;
}
