import { NextResponse } from "next/server";

import { requireAdmin, unauthorized } from "@/app/api/invoicing/_lib/invoicing";
import { automateReportPublication } from "@/lib/intelligence/reportWorkflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function clean(value: unknown, max = 1000) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const body = await request.json().catch(() => ({}));

  try {
    const result = await automateReportPublication({
      nicheId: clean(body.nicheId, 80),
      categoryName: clean(body.categoryName, 180),
      editionLabel: clean(body.editionLabel, 120),
      createdByPidUser: admin.pidUser,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Report automation failed.";
    const status =
      /already has a published report|already being generated/i.test(message)
        ? 409
        : /required|quality gate|fewer than|missing/i.test(message)
          ? 400
          : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
