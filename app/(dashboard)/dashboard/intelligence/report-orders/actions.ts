"use server";

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/app/api/invoicing/_lib/invoicing";
import { prisma } from "@/lib/prisma";

const PAGE_PATH = "/dashboard/intelligence/report-orders";

function clean(value: FormDataEntryValue | null, max = 500) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function eventId() {
  return `SIRE${randomBytes(12).toString("hex").toUpperCase()}`;
}

export async function updateReportOrderAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Unauthorized");

  const pidOrder = clean(formData.get("pidOrder"), 80);
  const action = clean(formData.get("action"), 40);
  const reason = clean(formData.get("reason"));
  if (!pidOrder) throw new Error("Order ID is required.");

  const order = await prisma.intelligence_report_orders.findUnique({
    where: { pidOrder },
  });
  if (!order) throw new Error("Report order was not found.");

  let nextStatus = order.status;
  let eventType = action;
  const now = new Date();
  const data: Prisma.intelligence_report_ordersUpdateInput = { updatedAt: now };

  if (action === "retry_delivery") {
    if (order.status !== "paid") {
      throw new Error("Only a paid order can be delivered.");
    }
    data.downloadToken = randomBytes(48).toString("base64url");
    data.downloadTokenExpiresAt = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
    data.fulfilledAt = null;
    data.fulfillmentClaimedAt = null;
    data.fulfillmentAttempts = 0;
    data.lastFulfillmentAttemptAt = null;
    data.fulfillmentError = null;
    eventType = "admin_delivery_retry_requested";
  } else if (action === "revoke") {
    if (!reason) throw new Error("A revocation reason is required.");
    if (["refunded", "reversed"].includes(order.status)) {
      throw new Error(
        "Refunded or reversed orders are already permanently blocked.",
      );
    }
    nextStatus = "revoked";
    data.status = nextStatus;
    data.revokedAt = now;
    data.revocationReason = reason;
    eventType = "admin_access_revoked";
  } else if (action === "restore") {
    if (!["revoked", "disputed"].includes(order.status)) {
      throw new Error(
        "Only revoked or reviewed disputed access can be restored.",
      );
    }
    if (order.refundedAt) {
      throw new Error("A refunded order cannot be restored.");
    }
    if (!reason) throw new Error("A restoration reason is required.");
    nextStatus = "paid";
    data.status = nextStatus;
    data.revokedAt = null;
    data.revocationReason = null;
    data.downloadToken = randomBytes(48).toString("base64url");
    data.downloadTokenExpiresAt = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
    data.fulfilledAt = null;
    data.fulfillmentClaimedAt = null;
    data.fulfillmentAttempts = 0;
    data.lastFulfillmentAttemptAt = null;
    data.fulfillmentError = null;
    eventType = "admin_access_restored";
  } else if (action === "confirm_refund") {
    if (!reason)
      throw new Error("Record the external refund reference or reason.");
    nextStatus = "refunded";
    data.status = nextStatus;
    data.refundedAt = now;
    data.revokedAt = now;
    data.revocationReason = reason;
    eventType = "admin_refund_confirmed";
  } else {
    throw new Error("Unsupported order action.");
  }

  await prisma.$transaction([
    prisma.intelligence_report_orders.update({
      where: { pidOrder },
      data,
    }),
    prisma.intelligence_report_order_events.create({
      data: {
        pidEvent: eventId(),
        orderId: pidOrder,
        source: "admin",
        eventType,
        previousStatus: order.status,
        nextStatus,
        details: {
          adminPidUser: admin.pidUser,
          reason: reason || null,
        },
      },
    }),
  ]);

  revalidatePath(PAGE_PATH);
}
