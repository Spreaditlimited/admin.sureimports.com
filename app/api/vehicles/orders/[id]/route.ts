import { prisma } from "@/lib/prisma";
import { vehicleAdmin } from "@/lib/vehicles/access";
import { vehicleRates } from "@/lib/vehicles/data";
import { vehicleEvent, vehicleId } from "@/lib/vehicles/events";
import { sameOrigin, inputText } from "@/lib/vehicles/http";
import {
  canQuote,
  canAdvance,
  priceVehicle,
  STAGE_LABELS,
  type VehicleSpec,
} from "@/lib/vehicles/policy";
import { randomBytes } from "node:crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await vehicleAdmin(true);
  if (!admin)
    return Response.json({ message: "Access denied" }, { status: 403 });
  try {
    sameOrigin(request);
    const body = await request.json();
    const { id } = await params;
    if (
      ["quote", "extend", "cancel"].includes(body.action) &&
      !(await vehicleAdmin(true, true))
    )
      return Response.json(
        { message: "Invoice editing permission is required." },
        { status: 403 },
      );
    const rates = body.action === "quote" ? await vehicleRates() : null;
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM vehicle_orders WHERE id = ${id} FOR UPDATE`;
      const order = await tx.vehicle_orders.findUniqueOrThrow({
        where: { id },
      });
      if (body.action === "quote") {
        if (order.status !== "ENQUIRY" || order.pidInvoice)
          throw new Error("This request already has a quotation.");
        const model = await tx.vehicle_models.findUnique({
          where: { slug: order.modelSlug },
        });
        if (!model)
          throw new Error(
            "This vehicle is missing from the saved catalogue. Import the supplied catalogue or restore this model before issuing a quotation.",
          );
        const variant = (model.variants as unknown as VehicleSpec[]).find(
          (v) => v.id === order.variantId,
        );
        if (!variant || !rates || !canQuote(variant, rates))
          throw new Error(
            "Confirm this configuration’s manufacturer price and specifications in the catalogue first.",
          );
        const price = priceVehicle(variant, rates, order.quantity)!;
        const eta = inputText(body.eta, "estimated delivery window", 160);
        const validityHours = Number(body.validityHours || 24);
        if (
          !Number.isInteger(validityHours) ||
          validityHours < 1 ||
          validityHours > 168
        )
          throw new Error("Quote validity must be 1–168 hours.");
        const dueAt = new Date(Date.now() + validityHours * 3600000);
        const pidInvoice = vehicleId("IV");
        const quoteNotes = inputText(
          body.notes,
          "confirmed configuration, availability, warranty and delivery terms",
          8000,
        );
        await tx.invoices.create({
          data: {
            pidInvoice,
            invoiceNumber: `VEH-${randomBytes(6).toString("hex").toUpperCase()}`,
            pidUser: order.pidUser,
            customerName: order.customerName,
            customerEmail: order.email,
            customerPhone: order.phone,
            currency: "NGN",
            subtotal: price.totalNgn,
            grandTotal: price.totalNgn,
            balanceDue: price.totalNgn,
            status: "ISSUED",
            issuedAt: new Date(),
            dueAt,
            linkedRequestId: `vehicle:${id}`,
            createdByPidUser: admin.pidUser,
            customerNotes: `${quoteNotes}\nEstimated shipping to Lagos includes clearing, all duties and taxes. Estimated Lagos arrival: ${eta}. The customer arranges collection and onward delivery from Lagos; last-mile delivery is not included.`,
            items: {
              create: [
                {
                  pidInvoiceItem: vehicleId("II"),
                  lineNo: 1,
                  description: `${order.vehicleName} — ${order.quantity} vehicle(s)`,
                  quantity: 1,
                  unitPrice: price.vehicleNgn,
                  lineTotal: price.vehicleNgn,
                },
                {
                  pidInvoiceItem: vehicleId("II"),
                  lineNo: 2,
                  description:
                    "Estimated shipping, including clearing, all duties and taxes",
                  quantity: 1,
                  unitPrice: price.shippingNgn,
                  lineTotal: price.shippingNgn,
                },
              ],
            },
            accessTokens: {
              create: {
                pidToken: vehicleId("IT"),
                accessToken: randomBytes(32).toString("hex"),
                expiresAt: new Date(Date.now() + 365 * 86400000),
                createdByPidUser: admin.pidUser,
              },
            },
          },
        });
        await tx.vehicle_orders.update({
          where: { id },
          data: {
            status: "QUOTED",
            pidInvoice,
            quoteExpiresAt: dueAt,
            eta,
            priceSnapshot: {
              ...price,
              rates,
              markup: 1.2,
              variant,
              notes: quoteNotes,
            },
          },
        });
        await vehicleEvent(
          tx,
          id,
          "QUOTED",
          `Your Naira quotation is ready. ${quoteNotes}\nEstimated delivery: ${eta}.`,
          admin.pidUser,
        );
      } else if (body.action === "extend") {
        if (order.status !== "QUOTED" || !order.pidInvoice)
          throw new Error("Only an unpaid quotation can be extended.");
        const reason = inputText(
          body.message,
          "confirmation of the original price and availability",
          2000,
        );
        const dueAt = new Date(Date.now() + 24 * 3600000);
        await tx.$queryRaw`SELECT id FROM invoices WHERE pidInvoice = ${order.pidInvoice} FOR UPDATE`;
        await tx.invoices.update({
          where: { pidInvoice: order.pidInvoice },
          data: { dueAt, updatedByPidUser: admin.pidUser },
        });
        await tx.vehicle_orders.update({
          where: { id },
          data: { quoteExpiresAt: dueAt },
        });
        await tx.invoice_audit_logs.create({
          data: {
            pidAuditLog: vehicleId("IA"),
            pidInvoice: order.pidInvoice,
            pidUser: admin.pidUser,
            action: "VEHICLE_QUOTE_EXTENDED",
            metadata: JSON.stringify({ reason, dueAt }),
          },
        });
        await vehicleEvent(
          tx,
          id,
          "UPDATE",
          `Your original quotation is valid for another 24 hours, until ${dueAt.toISOString()}. ${reason}`,
          admin.pidUser,
        );
      } else if (body.action === "cancel") {
        if (!["ENQUIRY", "QUOTED"].includes(order.status))
          throw new Error(
            "Only unpaid orders can be cancelled here. Paid orders require refund reconciliation.",
          );
        const reason = inputText(body.message, "cancellation reason", 2000);
        if (order.pidInvoice) {
          await tx.$queryRaw`SELECT id FROM invoices WHERE pidInvoice = ${order.pidInvoice} FOR UPDATE`;
          const invoice = await tx.invoices.findUniqueOrThrow({
            where: { pidInvoice: order.pidInvoice },
          });
          const pending = await tx.invoice_payment_claims.count({
            where: {
              pidInvoice: order.pidInvoice,
              status: "PENDING_CONFIRMATION",
            },
          });
          if (Number(invoice.amountPaid) > 0 || pending > 0)
            throw new Error(
              "Reconcile received or pending payments before cancellation.",
            );
          await tx.invoices.update({
            where: { pidInvoice: order.pidInvoice },
            data: { status: "CANCELLED", updatedByPidUser: admin.pidUser },
          });
          await tx.invoice_audit_logs.create({
            data: {
              pidAuditLog: vehicleId("IA"),
              pidInvoice: order.pidInvoice,
              pidUser: admin.pidUser,
              action: "VEHICLE_ORDER_CANCELLED",
              metadata: JSON.stringify({ reason }),
            },
          });
        }
        await tx.vehicle_orders.update({
          where: { id },
          data: { status: "CANCELLED" },
        });
        await vehicleEvent(tx, id, "CANCELLED", reason, admin.pidUser);
      } else if (body.action === "update") {
        const message = inputText(body.message, "customer update", 4000);
        const next = String(body.status);
        const invoice = order.pidInvoice
          ? await tx.invoices.findUnique({
              where: { pidInvoice: order.pidInvoice },
            })
          : null;
        if (next !== order.status) {
          if (!canAdvance(order.status, next))
            throw new Error("Choose the next fulfilment stage.");
          if (!invoice || Number(invoice.balanceDue) > 0)
            throw new Error(
              "Confirm full payment before progressing this order.",
            );
        }
        if (["DELIVERED", "CANCELLED"].includes(order.status))
          throw new Error("This order is closed.");
        await tx.vehicle_orders.update({
          where: { id },
          data: {
            status: next,
            eta:
              inputText(
                body.eta || order.eta || "",
                "delivery window",
                160,
                false,
              ) || null,
          },
        });
        await vehicleEvent(
          tx,
          id,
          next === order.status ? "UPDATE" : next,
          `${STAGE_LABELS[next] || next}: ${message}`,
          admin.pidUser,
        );
      } else if (body.action === "retry") {
        await tx.vehicle_notifications.updateMany({
          where: { event: { orderId: id }, status: "FAILED" },
          data: {
            status: "PENDING",
            attempts: 0,
            nextAttemptAt: new Date(),
            leaseUntil: null,
          },
        });
      } else {
        throw new Error("Unknown action.");
      }
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ message: (e as Error).message }, { status: 400 });
  }
}
