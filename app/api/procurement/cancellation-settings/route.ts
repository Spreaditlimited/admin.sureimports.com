import { NextResponse } from "next/server";
import { requireAdminServiceAccess } from "@/app/api/_lib/adminAccess";
import { prisma } from "@/lib/prisma";
import { cancellationAmounts } from "@/lib/procurement/cancellation-policy";
export async function GET() {
  const access = await requireAdminServiceAccess("system_settings", "view");
  if (!access.ok) return access.response;
  const [settings] = await prisma.$queryRaw<
    Array<{ feePercent: string }>
  >`SELECT feePercent FROM procurement_cancellation_settings WHERE id=1`;
  return NextResponse.json({
    feePercent: String(settings?.feePercent ?? "2.00"),
  });
}
export async function PUT(request: Request) {
  const access = await requireAdminServiceAccess("system_settings", "edit");
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
    const { feePercent } = await request.json();
    cancellationAmounts(BigInt(10000), String(feePercent));
    if (Number(feePercent) >= 100)
      throw Error("The cancellation fee must be below 100%.");
    await prisma.$executeRaw`UPDATE procurement_cancellation_settings SET feePercent=${String(feePercent)},updatedBy=${access.admin.pidUser},updatedAt=NOW(3) WHERE id=1`;
    return NextResponse.json({ message: "Cancellation fee saved." });
  } catch {
    return NextResponse.json(
      {
        message:
          "Enter a percentage from 0 to 99.99 with at most two decimal places.",
      },
      { status: 400 },
    );
  }
}
