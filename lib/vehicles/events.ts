import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

export const vehicleId = (prefix: string) => `${prefix}-${randomUUID()}`;
export async function vehicleEvent(
  tx: Prisma.TransactionClient,
  orderId: string,
  type: string,
  message: string,
  actor: string,
) {
  const order = await tx.vehicle_orders.findUniqueOrThrow({
    where: { id: orderId },
  });
  return tx.vehicle_events.create({
    data: {
      id: vehicleId("VE"),
      orderId,
      type,
      message,
      actor,
      notifications: {
        create: [
          { id: vehicleId("VN"), channel: "EMAIL" },
          ...(order.whatsappConsent
            ? [{ id: vehicleId("VN"), channel: "WHATSAPP" }]
            : []),
        ],
      },
    },
  });
}
