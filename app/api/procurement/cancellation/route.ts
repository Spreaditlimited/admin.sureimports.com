import { NextResponse } from "next/server";
import { requireAdminServiceAccess } from "@/app/api/_lib/adminAccess";
import {
  cancelProcurement,
  getCancellationQuote,
  CancellationError,
} from "@/lib/procurement/cancellation";
import { reverseAffiliateConversions } from "@/lib/affiliate/reversals";
export async function GET(request: Request) {
  const access = await requireAdminServiceAccess("procurement", "edit");
  if (!access.ok) return access.response;
  const params = new URL(request.url).searchParams;
  try {
    return NextResponse.json(
      await getCancellationQuote(
        params.get("pidOrder") || "",
        { kind: "admin", pidUser: access.admin.pidUser },
        params.get("chargeFee") === "true",
      ),
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof CancellationError
            ? error.message
            : "Unable to prepare cancellation. Please try again.",
      },
      { status: 409 },
    );
  }
}
export async function POST(request: Request) {
  const access = await requireAdminServiceAccess("procurement", "edit");
  if (!access.ok) return access.response;
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return NextResponse.json(
      { message: "Refresh and try again." },
      { status: 403 },
    );
  try {
    const body = await request.json();
    if (body.confirmed !== true || typeof body.chargeFee !== "boolean")
      return NextResponse.json(
        { message: "Confirm the cancellation amounts first." },
        { status: 400 },
      );
    const result = await cancelProcurement(
      String(body.pidOrder || ""),
      { kind: "admin", pidUser: access.admin.pidUser },
      body.chargeFee,
      String(body.token || ""),
    );
    // Refund credit is already committed. Notification/commission retries must not report a failed cancellation.
    try {
      await reverseAffiliateConversions({
        externalOrderReference: `procurement:${body.pidOrder}`,
        reason: "Order cancelled and refund balance credited.",
        reversalReference: `cancellation:${body.pidOrder}`,
      });
    } catch {
      console.error(
        "Cancellation commission reversal requires retry",
        body.pidOrder,
      );
    }
    return NextResponse.json({
      ...result,
      message:
        "Order cancelled. The refund is available in the customer’s Refunds page.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof CancellationError
            ? error.message
            : "Unable to confirm cancellation. Refresh the order and refund balance before retrying.",
      },
      { status: 409 },
    );
  }
}
