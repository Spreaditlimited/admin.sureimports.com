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
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const startedAt = Date.now();
      const send = (event: Record<string, unknown>) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false;
        }
      };
      const heartbeat = setInterval(
        () =>
          send({
            type: "heartbeat",
            elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
          }),
        15_000,
      );

      try {
        const result = await automateReportPublication(
          {
            nicheId: clean(body.nicheId, 80),
            categoryName: clean(body.categoryName, 180),
            editionLabel: clean(body.editionLabel, 120),
            createdByPidUser: admin.pidUser,
          },
          (progress) => send({ type: "progress", ...progress }),
        );
        send({
          type: "complete",
          awaitingApproval: true,
          supplierCount: result.version.supplierCount,
          pidReport: result.report?.pidReport,
        });
      } catch (error) {
        send({
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Report automation failed.",
        });
      } finally {
        clearInterval(heartbeat);
        if (open) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
