import { validRefundCalendar } from "@/lib/vehicles/refunds";
import { prisma } from "@/lib/prisma";
import { vehicleAdmin } from "@/lib/vehicles/access";
import { sameOrigin } from "@/lib/vehicles/http";
import {
  validPlanSettings,
  type PlanSettings,
} from "@/lib/vehicles/installments";
import { vehicleId } from "@/lib/vehicles/events";
export async function POST(request: Request) {
  const admin = await vehicleAdmin(true, true);
  if (!admin)
    return Response.json(
      { message: "Finance permission required." },
      { status: 403 },
    );
  try {
    sameOrigin(request);
    const body = await request.json();
    const settings: PlanSettings = {
      enabled: body.enabled,
      depositPercent: body.depositPercent,
      feePercent: body.feePercent,
      durationDays: body.durationDays,
      revision: body.revision,
      refundBusinessDays: body.refundBusinessDays,
      refundHolidays: body.refundHolidays,
    };
    if (
      !validPlanSettings(settings) ||
      !validRefundCalendar(
        settings.refundBusinessDays!,
        settings.refundHolidays!,
      )
    )
      throw new Error(
        "Use a deposit above 0% and at most 100%, a fee from 0–100% (two decimals), 1–365 payment days, 1–60 refund business days and valid holiday dates.",
      );
    await prisma.$transaction(async (tx) => {
      const n =
        await tx.$executeRaw`UPDATE vehicle_plan_settings SET enabled=${settings.enabled},depositPercent=${settings.depositPercent},feePercent=${settings.feePercent},durationDays=${settings.durationDays},refundBusinessDays=${settings.refundBusinessDays!},refundHolidays=${JSON.stringify(settings.refundHolidays)},revision=revision+1,updatedBy=${admin.pidUser},updatedAt=NOW(3) WHERE id=1 AND revision=${settings.revision}`;
      if (n !== 1)
        throw new Error(
          "Settings changed or migration is pending. Refresh before saving.",
        );
      const id = vehicleId("PS");
      await tx.$executeRaw`INSERT INTO vehicle_plan_settings_audit (id,revision,settings,actor) VALUES (${id},${settings.revision + 1},${JSON.stringify({ ...settings, revision: settings.revision + 1 })},${admin.pidUser})`;
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      {
        message: (e as { code?: string }).code
          ? "Unable to save settings. Check the migration and retry."
          : (e as Error).message,
      },
      { status: 400 },
    );
  }
}
