import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminServiceAccess } from "@/app/api/_lib/adminAccess";
import {
  assistanceId,
  ensureCaseOrder,
  getActiveAssistance,
  mergeAssistedOrders,
  procurementOrderId,
} from "@/lib/procurementAssistance";
import { normalizeProductUrl } from "@/lib/productUrl";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ pidCase: string }> },
) {
  const access = await requireAdminServiceAccess("procurement", "edit");
  if (!access.ok) return access.response;
  const { pidCase } = await params;
  const body = await request.json();
  try {
    if (body.action === "claim") {
      const admin = await prisma.admin.findUnique({
        where: { pidUser: access.admin.pidUser },
      });
      const claimed = await prisma.procurement_assistance_cases.updateMany({
        where: {
          pidCase,
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
          OR: [
            { assignedAdminPidUser: null },
            { assignedAdminPidUser: access.admin.pidUser },
          ],
        },
        data: {
          assignedAdminPidUser: access.admin.pidUser,
          assignedAdminName:
            [admin?.userFirstname, admin?.userLastname]
              .filter(Boolean)
              .join(" ") || admin?.userEmail,
          claimedAt: new Date(),
        },
      });
      if (!claimed.count)
        throw new Error(
          "Authorization expired, was revoked, or another admin already claimed it.",
        );
      await prisma.procurement_assistance_events.create({
        data: {
          pidEvent: assistanceId("PE"),
          pidCase,
          actorType: "ADMIN",
          actorPid: access.admin.pidUser,
          eventType: "CLAIMED",
        },
      });
    } else if (body.action === "release") {
      await getActiveAssistance(pidCase, access.admin.pidUser, "canEditOrder");
      const createdOrderEvents =
        await prisma.procurement_assistance_events.findMany({
          where: {
            pidCase,
            eventType: "ORDER_CREATED",
            pidOrder: { not: null },
          },
          select: { pidOrder: true },
        });
      const createdOrderIds = createdOrderEvents.flatMap((event) =>
        event.pidOrder ? [event.pidOrder] : [],
      );
      await prisma.$transaction([
        prisma.procurement_assistance_cases.update({
          where: { pidCase },
          data: {
            status: "RELEASED",
            releasedAt: new Date(),
            resolutionNote:
              String(body.resolutionNote || "").slice(0, 3000) || null,
            assignedAdminPidUser: null,
            assignedAdminName: null,
            claimedAt: null,
          },
        }),
        ...(createdOrderIds.length
          ? [
              prisma.orders.updateMany({
                where: {
                  pidOrder: { in: createdOrderIds },
                  status: "saved",
                  pidAdmin: access.admin.pidUser,
                },
                data: { pidAdmin: null, claimedAt: null },
              }),
            ]
          : []),
        prisma.procurement_assistance_events.create({
          data: {
            pidEvent: assistanceId("PE"),
            pidCase,
            actorType: "ADMIN",
            actorPid: access.admin.pidUser,
            eventType: "RELEASED",
          },
        }),
      ]);
    } else if (body.action === "updateOrder") {
      const item = await getActiveAssistance(
        pidCase,
        access.admin.pidUser,
        "canEditOrder",
      );
      await ensureCaseOrder(pidCase, body.pidOrder, item.pidUser);
      const allowed = [
        "orderName",
        "orderCategory",
        "shippingAddress",
      ] as const;
      const data = Object.fromEntries(
        allowed
          .filter((key) => typeof body[key] === "string")
          .map((key) => [key, body[key].trim().slice(0, 1000)]),
      );
      await prisma.orders.update({
        where: { pidOrder: body.pidOrder },
        data: {
          ...data,
          assistanceRevision: { increment: 1 },
          updatedAt: new Date(),
        },
      });
      await prisma.procurement_assistance_events.create({
        data: {
          pidEvent: assistanceId("PE"),
          pidCase,
          pidOrder: body.pidOrder,
          actorType: "ADMIN",
          actorPid: access.admin.pidUser,
          eventType: "ORDER_UPDATED",
          detailsJson: { fields: Object.keys(data) },
        },
      });
    } else if (body.action === "createOrder") {
      const item = await prisma.procurement_assistance_cases.findFirst({
        where: {
          pidCase,
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
          assignedAdminPidUser: access.admin.pidUser,
          canCreateOrder: true,
        },
      });
      if (!item)
        throw new Error("This request does not authorize creating an order.");
      const plan = await prisma.shippingplan.findFirst({
        where: {
          pidShippingPlan: body.shippingPlan,
          countryId: body.destinationCountry,
        },
        include: { country: true },
      });
      if (!plan?.shippingPlanRate || !plan.country.countryName)
        throw new Error("Choose a valid destination and shipping plan.");
      const isNigeriaSea =
        plan.country.countryName.toLowerCase().includes("nigeria") &&
        String(plan.shippingPlanName).toLowerCase().includes("sea");
      const financial = isNigeriaSea
        ? await prisma.exchange_rate.findUnique({ where: { id: 1 } })
        : null;
      const rate = isNigeriaSea
        ? Number(financial?.quotationSeaRateNgnPerCbm)
        : Number(plan.shippingPlanRate);
      if (!Number.isFinite(rate) || rate <= 0)
        throw new Error("The selected shipping rate is unavailable.");
      const pidOrder = procurementOrderId();
      await prisma.$transaction([
        prisma.orders.create({
          data: {
            pidOrder,
            pidUser: item.pidUser,
            orderName: String(body.orderName || "")
              .trim()
              .slice(0, 500),
            destinationCountry: body.destinationCountry,
            currencyType: ["CNY", "USD"].includes(body.currencyType)
              ? body.currencyType
              : "USD",
            shippingPlan: body.shippingPlan,
            orderCategory: String(body.orderCategory || "Other Goods").slice(
              0,
              191,
            ),
            shippingAddress: String(body.shippingAddress || "")
              .trim()
              .slice(0, 1000),
            shippingPricingVersion: 2,
            shippingMeasurementUnit: isNigeriaSea ? "CBM" : "KG",
            shippingRateSnapshot: rate,
            shippingRateCurrency: isNigeriaSea ? "NGN" : "USD",
            status: "saved",
            assistanceRevision: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }),
        prisma.procurement_assistance_case_orders.create({
          data: { pidCase, pidOrder },
        }),
        prisma.procurement_assistance_events.create({
          data: {
            pidEvent: assistanceId("PE"),
            pidCase,
            pidOrder,
            actorType: "ADMIN",
            actorPid: access.admin.pidUser,
            eventType: "ORDER_CREATED",
          },
        }),
      ]);
    } else if (body.action === "addProduct") {
      const item = await getActiveAssistance(
        pidCase,
        access.admin.pidUser,
        "canManageProducts",
      );
      const order = await ensureCaseOrder(pidCase, body.pidOrder, item.pidUser);
      const productLink = normalizeProductUrl(body.productLink);
      const price = Number(body.productPrice),
        quantity = Number(body.productQuantity),
        measure = Number(body.productWeight);
      if (
        !body.productName?.trim() ||
        !productLink ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isFinite(quantity) ||
        quantity < 1 ||
        !Number.isFinite(measure) ||
        measure <= 0
      )
        throw new Error(
          "Enter a valid product name, link, price, quantity and weight/CBM.",
        );
      await prisma.products.create({
        data: {
          pidProduct: assistanceId("PD"),
          pidOrder: body.pidOrder,
          pidUser: item.pidUser,
          productName: body.productName.trim().slice(0, 500),
          productLink,
          productPrice: price,
          productQuantity: quantity,
          productWeight: order.shippingPricingVersion === 2 ? null : measure,
          shippingMeasurePerUnit:
            order.shippingPricingVersion === 2 ? measure : null,
          productInfo: String(body.productInfo || "").slice(0, 3000) || null,
          pidAdmin: access.admin.pidUser,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      await prisma.orders.update({
        where: { pidOrder: body.pidOrder },
        data: { assistanceRevision: { increment: 1 }, updatedAt: new Date() },
      });
      await prisma.procurement_assistance_events.create({
        data: {
          pidEvent: assistanceId("PE"),
          pidCase,
          pidOrder: body.pidOrder,
          actorType: "ADMIN",
          actorPid: access.admin.pidUser,
          eventType: "PRODUCT_ADDED",
        },
      });
    } else if (body.action === "merge") {
      const item = await getActiveAssistance(
        pidCase,
        access.admin.pidUser,
        "canMergeOrders",
      );
      await mergeAssistedOrders({
        pidCase,
        pidUser: item.pidUser,
        orderIds: body.orderIds || [],
        targetOrderId: body.targetOrderId,
        actorPid: access.admin.pidUser,
        idempotencyKey: body.idempotencyKey || assistanceId("IK"),
      });
      await prisma.procurement_assistance_events.create({
        data: {
          pidEvent: assistanceId("PE"),
          pidCase,
          pidOrder: body.targetOrderId,
          actorType: "ADMIN",
          actorPid: access.admin.pidUser,
          eventType: "ORDERS_MERGED",
          detailsJson: { orderIds: body.orderIds },
        },
      });
    } else throw new Error("Unsupported action.");
    return NextResponse.json({ statusx: "SUCCESS" });
  } catch (error) {
    return NextResponse.json(
      {
        statusx: "FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unable to update assistance request.",
      },
      { status: 409 },
    );
  }
}
