import { NextResponse } from "next/server";

import { requireAdmin, unauthorized } from "@/app/api/invoicing/_lib/invoicing";
import { generateReportEdition } from "@/lib/intelligence/reportWorkflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  context: { params: Promise<{ pidReport: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { pidReport } = await context.params;

  try {
    const version = await generateReportEdition(pidReport, admin.pidUser);
    return NextResponse.json({ success: true, data: version });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "PDF generation failed." },
      { status: 500 },
    );
  }
}
