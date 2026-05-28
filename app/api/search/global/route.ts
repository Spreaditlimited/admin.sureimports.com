import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

type SearchResult = {
  entityType: "admin" | "customer" | "order" | "store" | "invoice" | "payout";
  entityId: string;
  title: string;
  subtitle: string;
  route: string;
};

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || typeof payload !== "object" || !("pidUser" in payload)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [admins, customers, orders, products, invoices, payouts] = await Promise.all([
      prisma.admin.findMany({
        where: {
          OR: [
            { pidUser: { contains: q } },
            { userEmail: { contains: q } },
            { userFirstname: { contains: q } },
            { userLastname: { contains: q } },
          ],
        },
        select: {
          pidUser: true,
          userEmail: true,
          userFirstname: true,
          userLastname: true,
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.users.findMany({
        where: {
          OR: [
            { pidUser: { contains: q } },
            { userEmail: { contains: q } },
            { userFirstname: { contains: q } },
            { userLastname: { contains: q } },
            { phone: { contains: q } },
            { userPhone: { contains: q } },
          ],
        },
        select: {
          pidUser: true,
          userEmail: true,
          userFirstname: true,
          userLastname: true,
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.orders.findMany({
        where: {
          OR: [
            { pidOrder: { contains: q } },
            { orderName: { contains: q } },
            { trackingNumber: { contains: q } },
            { trackingLink: { contains: q } },
          ],
        },
        select: {
          pidOrder: true,
          orderName: true,
          orderStatus: true,
          pidUser: true,
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.store.findMany({
        where: {
          OR: [
            { pidProduct: { contains: q } },
            { productName: { contains: q } },
            { productSlug: { contains: q } },
            { productBrand: { contains: q } },
          ],
        },
        select: {
          pidProduct: true,
          productName: true,
          productBrand: true,
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoices.findMany({
        where: {
          OR: [
            { pidInvoice: { contains: q } },
            { invoiceNumber: { contains: q } },
            { customerName: { contains: q } },
            { customerEmail: { contains: q } },
            { customerPhone: { contains: q } },
          ],
        },
        select: {
          pidInvoice: true,
          invoiceNumber: true,
          customerName: true,
          customerEmail: true,
          status: true,
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.payoutrequest.findMany({
        where: {
          OR: [
            { pidPayout: { contains: q } },
            { recipient: { contains: q } },
            { reference: { contains: q } },
            { reason: { contains: q } },
          ],
        },
        select: {
          pidPayout: true,
          recipient: true,
          status: true,
          amount: true,
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const results: SearchResult[] = [
      ...admins.map((item) => ({
        entityType: "admin" as const,
        entityId: item.pidUser,
        title: `${item.userFirstname || ""} ${item.userLastname || ""}`.trim() || item.userEmail,
        subtitle: `${item.userEmail} • ${item.pidUser}`,
        route: "/dashboard/admin/view",
      })),
      ...customers.map((item) => ({
        entityType: "customer" as const,
        entityId: item.pidUser,
        title: `${item.userFirstname || ""} ${item.userLastname || ""}`.trim() || item.userEmail,
        subtitle: `${item.userEmail} • ${item.pidUser}`,
        route: `/dashboard/customer-accounts/customers/details?pidUser=${encodeURIComponent(item.pidUser)}`,
      })),
      ...orders.map((item) => ({
        entityType: "order" as const,
        entityId: item.pidOrder,
        title: item.orderName || item.pidOrder,
        subtitle: `${item.pidOrder} • ${item.orderStatus || "Unknown"} • Customer ${item.pidUser}`,
        route: "/dashboard/procurement?status=all",
      })),
      ...products.map((item) => ({
        entityType: "store" as const,
        entityId: item.pidProduct,
        title: item.productName || item.pidProduct,
        subtitle: `${item.pidProduct} • ${item.productBrand || "No brand"}`,
        route: `/dashboard/store/details?id=${encodeURIComponent(item.pidProduct)}`,
      })),
      ...invoices.map((item) => ({
        entityType: "invoice" as const,
        entityId: item.pidInvoice,
        title: item.invoiceNumber,
        subtitle: `${item.customerName || item.customerEmail || "Unknown customer"} • ${item.status}`,
        route: `/dashboard/invoicing/${encodeURIComponent(item.pidInvoice)}`,
      })),
      ...payouts.map((item) => ({
        entityType: "payout" as const,
        entityId: item.pidPayout,
        title: item.pidPayout,
        subtitle: `${item.recipient || "Unknown recipient"} • ${item.status || "Unknown"} • ₦${Number(item.amount || 0).toLocaleString("en-NG")}`,
        route: "/dashboard/payout-requests/requests",
      })),
    ].slice(0, 20);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Global search error:", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
