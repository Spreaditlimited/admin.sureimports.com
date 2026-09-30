import { Prisma } from "@prisma/client";
import { getVehiclePlans } from "@/lib/vehicles/plans";
import { prisma } from "@/lib/prisma";
import { vehicleAdmin } from "@/lib/vehicles/access";
export async function GET() {
  if (!(await vehicleAdmin()))
    return Response.json({ message: "Access denied" }, { status: 403 });
  const orders = await prisma.vehicle_orders.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      events: {
        orderBy: { createdAt: "desc" },
        include: {
          notifications: {
            select: {
              id: true,
              channel: true,
              status: true,
              attempts: true,
              lastError: true,
            },
          },
        },
      },
      proofs: { select: { id: true, claimId: true, createdAt: true } },
    },
  });
  const invoices = await prisma.invoices.findMany({
    where: {
      pidInvoice: {
        in: orders.flatMap((o) => (o.pidInvoice ? [o.pidInvoice] : [])),
      },
    },
    include: { paymentClaims: true },
  });
  const plans = await getVehiclePlans(orders.map((o) => o.id));
  const reversals = plans.length
    ? await prisma.$queryRaw<
        { orderId: string; claimId: string; status: string; reason: string }[]
      >`SELECT orderId,claimId,status,reason FROM vehicle_credit_reversals WHERE orderId IN (${Prisma.join(plans.map((p) => p.orderId))})`
    : [];
  return Response.json(
    {
      orders: orders.map((o) => ({
        plan: plans.find((p) => p.orderId === o.id) || null,
        ...o,
        reversals: reversals.filter((r) => r.orderId === o.id),
        invoice: invoices.find((i) => i.pidInvoice === o.pidInvoice) || null,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
