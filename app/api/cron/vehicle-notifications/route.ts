import { queueVehiclePlanReminders } from "@/lib/vehicles/planReminders";
import { dispatchVehicleNotifications } from "@/lib/vehicles/notifications";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  await queueVehiclePlanReminders();
  return Response.json(await dispatchVehicleNotifications());
}
