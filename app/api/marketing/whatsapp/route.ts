import { requireAdminServiceAccess } from "@/app/api/_lib/adminAccess";
import { retryReportRead } from "@/lib/marketing/whatsappReadRetry";
import {
  report,
  saveLead,
  WhatsAppValidationError,
} from "@/lib/marketing/whatsapp";

export async function GET(request: Request) {
  try {
    return await retryReportRead(async () => {
    const access = await requireAdminServiceAccess(
      "whatsapp_performance",
      "view",
    );
    if (!access.ok) return access.response;
    const data = await report(new URL(request.url).searchParams);
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
    });
  } catch (error) {
    const validation = error instanceof WhatsAppValidationError;
    if (!validation) {
      const details = error as { name?: string; code?: string; meta?: { code?: string } };
      console.error("[whatsapp-report] Failed", { name: details?.name, code: details?.code, databaseCode: details?.meta?.code });
    }
    return Response.json(
      {
        error: validation
          ? error.message
          : "WhatsApp reporting is temporarily unavailable. Please try again.",
      },
      { status: validation ? 400 : 503 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const access = await requireAdminServiceAccess(
      "whatsapp_performance",
      "edit",
    );
    if (!access.ok) return access.response;
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json(
        { error: "Refresh this page and try again." },
        { status: 403 },
      );
    const raw = await request.text();
    if (raw.length > 8000)
      return Response.json(
        { error: "Please shorten the enquiry notes." },
        { status: 413 },
      );
    const id = await saveLead(JSON.parse(raw), access.admin.pidUser);
    return Response.json({ id });
  } catch (error) {
    const duplicate =
      (error as { meta?: { code?: string } })?.meta?.code === "1062";
    const message = duplicate
      ? "This number or click reference already has a lead for this website. Edit the existing lead instead."
      : error instanceof WhatsAppValidationError
        ? error.message
        : "The lead could not be saved. Refresh and try again.";
    return Response.json({ error: message }, { status: duplicate ? 409 : 400 });
  }
}
