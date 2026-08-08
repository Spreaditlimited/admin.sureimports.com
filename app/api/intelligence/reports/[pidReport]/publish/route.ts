import { NextResponse } from "next/server";

import { requireAdmin, unauthorized } from "@/app/api/invoicing/_lib/invoicing";
import { publishReportEdition } from "@/lib/intelligence/reportWorkflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ pidReport: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { pidReport } = await context.params;
  const body = await request.json().catch(() => ({}));
  const versionId = String(body.versionId || "").trim();
  try {
    await publishReportEdition(pidReport, versionId);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "This edition did not pass the publication quality gate.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
