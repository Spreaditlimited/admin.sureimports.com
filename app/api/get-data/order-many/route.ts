import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") || "";
  const search =
    request.nextUrl.searchParams.get("search")?.trim().slice(0, 160) || "";
  const searchTerms = search.toLowerCase().split(/\s+/).filter(Boolean);

  const savedStatuses = ["saved", "bank-pending-saved-orders"];
  if (savedStatuses.includes(status)) {
    const orphanOrders = await prisma.orders.findMany({
      where: {
        status,
        products: { none: {} },
      },
      select: { pidOrder: true },
    });

    if (orphanOrders.length > 0) {
      await prisma.orders.deleteMany({
        where: {
          pidOrder: { in: orphanOrders.map((row) => row.pidOrder) },
        },
      });
    }
  }

  const orderALL = await prisma.orders.findMany({
    take: search ? 100 : 50,
    where: {
      status,
      products: { some: {} },
      ...(searchTerms.length
        ? {
            AND: searchTerms.map((term) => ({
              OR: [
                { pidOrder: { contains: term } },
                { pidUser: { contains: term } },
                { orderName: { contains: term } },
                { destinationCountry: { contains: term } },
                { shippingPlan: { contains: term } },
                { orderCategory: { contains: term } },
                { shippingAddress: { contains: term } },
                { trackingNumber: { contains: term } },
                { trackingCompany: { contains: term } },
                { user: { userFirstname: { contains: term } } },
                { user: { userLastname: { contains: term } } },
                { user: { userEmail: { contains: term } } },
                { user: { userPhone: { contains: term } } },
                { user: { phone: { contains: term } } },
                { products: { some: { productName: { contains: term } } } },
                { products: { some: { productCategory: { contains: term } } } },
                { products: { some: { productLink: { contains: term } } } },
              ],
            })),
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      user: true,
    },
  });

  const claimantIds = Array.from(
    new Set(
      orderALL
        .map((order) => order.pidAdmin)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const claimants = claimantIds.length
    ? await prisma.admin.findMany({
        where: { pidUser: { in: claimantIds } },
        select: {
          pidUser: true,
          userFirstname: true,
          userLastname: true,
          userEmail: true,
        },
      })
    : [];
  const claimantById = new Map(
    claimants.map((admin) => [admin.pidUser, admin]),
  );
  const ordersWithClaims = orderALL.map((order) => {
    const claimant = order.pidAdmin ? claimantById.get(order.pidAdmin) : null;
    const adminName = claimant
      ? [claimant.userFirstname, claimant.userLastname]
          .filter(Boolean)
          .join(" ")
          .trim() || claimant.userEmail
      : null;

    return {
      ...order,
      claimedByAdmin: order.pidAdmin
        ? {
            pidAdmin: order.pidAdmin,
            adminName: adminName || order.pidAdmin,
            claimedAt: order.claimedAt,
          }
        : null,
    };
  });

  return NextResponse.json(ordersWithClaims, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
