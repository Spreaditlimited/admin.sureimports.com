import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminServiceAccess } from "@/app/api/_lib/adminAccess";

export async function GET() {
  const access = await requireAdminServiceAccess("procurement", "view");
  if (!access.ok) return access.response;
  const expiringCases = await prisma.procurement_assistance_cases.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: new Date() } },
    select: { pidCase: true, assignedAdminPidUser: true },
  });
  if (expiringCases.length) {
    const createdOrderEvents =
      await prisma.procurement_assistance_events.findMany({
        where: {
          pidCase: { in: expiringCases.map((item) => item.pidCase) },
          eventType: "ORDER_CREATED",
          pidOrder: { not: null },
        },
        select: { pidCase: true, pidOrder: true },
      });
    const releaseOperations = expiringCases.flatMap((item) => {
      if (!item.assignedAdminPidUser) return [];
      const orderIds = createdOrderEvents.flatMap((event) =>
        event.pidCase === item.pidCase && event.pidOrder
          ? [event.pidOrder]
          : [],
      );
      return orderIds.length
        ? [
            prisma.orders.updateMany({
              where: {
                pidOrder: { in: orderIds },
                status: "saved",
                pidAdmin: item.assignedAdminPidUser,
              },
              data: { pidAdmin: null, claimedAt: null },
            }),
          ]
        : [];
    });
    await prisma.$transaction([
      ...releaseOperations,
      prisma.procurement_assistance_cases.updateMany({
        where: {
          pidCase: { in: expiringCases.map((item) => item.pidCase) },
          status: "ACTIVE",
        },
        data: {
          status: "EXPIRED",
          activeRequestKey: null,
          assignedAdminPidUser: null,
          assignedAdminName: null,
          claimedAt: null,
        },
      }),
    ]);
  }
  const cases = await prisma.procurement_assistance_cases.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  const [users, scopes] = await Promise.all([
    prisma.users.findMany({
      where: { pidUser: { in: cases.map((item) => item.pidUser) } },
      select: {
        pidUser: true,
        userFirstname: true,
        userLastname: true,
        userEmail: true,
        userPhone: true,
        phone: true,
        userCountry: true,
        country: true,
      },
    }),
    prisma.procurement_assistance_case_orders.findMany({
      where: { pidCase: { in: cases.map((item) => item.pidCase) } },
    }),
  ]);
  const orders = await prisma.orders.findMany({
    where: { pidOrder: { in: scopes.map((item) => item.pidOrder) } },
    include: { products: true },
  });
  return NextResponse.json(
    cases.map((item) => ({
      ...item,
      user: users.find((user) => user.pidUser === item.pidUser),
      orders: orders.filter((order) =>
        scopes.some(
          (scope) =>
            scope.pidCase === item.pidCase && scope.pidOrder === order.pidOrder,
        ),
      ),
    })),
  );
}
