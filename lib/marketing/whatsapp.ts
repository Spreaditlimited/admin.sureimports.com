import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const sites = [
  "sureimports",
  "linescout",
  "affiliate",
  "partner",
  "unknown",
] as const;
export const statuses = [
  "NEW",
  "QUALIFIED",
  "WON",
  "LOST",
  "SUPPORT",
  "INVALID",
] as const;
export class WhatsAppValidationError extends Error {}
export const leadSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s().-]/g, ""))
      .pipe(
        z
          .string()
          .regex(
            /^\+[1-9]\d{7,14}$/,
            "Include the country code, for example +2348031234567.",
          ),
      ),
    site: z.enum(sites),
    status: z.enum(statuses),
    clickId: z
      .string()
      .trim()
      .transform((v) => v.replace(/^WA-/i, "").toLowerCase())
      .pipe(z.union([z.literal(""), z.string().uuid()])),
    notes: z.string().trim().max(1000),
    receivedAt: z.string().datetime(),
  })
  .strict();

// Reports use Lagos calendar boundaries (UTC+1), not the server timezone.
export function periodStart(period: string, now = new Date()) {
  const local = new Date(now.getTime() + 3600000);
  local.setUTCHours(0, 0, 0, 0);
  if (period === "week")
    local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
  if (period === "month") local.setUTCDate(1);
  if (period === "year") {
    local.setUTCMonth(0, 1);
  }
  return new Date(local.getTime() - 3600000);
}
export function reportRange(params: URLSearchParams, now = new Date()) {
  const period = params.get("period") || "month";
  if (period === "custom") {
    const from = params.get("from") || "",
      to = params.get("to") || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
      throw new WhatsAppValidationError("Choose a valid start and end date.");
    const start = new Date(from + "T00:00:00+01:00");
    const end = new Date(new Date(to + "T00:00:00+01:00").getTime() + 86400000);
    if (
      new Date(+start + 3600000).toISOString().slice(0, 10) !== from ||
      new Date(+end - 86400000 + 3600000).toISOString().slice(0, 10) !== to
    )
      throw new WhatsAppValidationError("Choose valid calendar dates.");
    if (
      !Number.isFinite(+start) ||
      !Number.isFinite(+end) ||
      end <= start ||
      +end - +start > 366 * 86400000
    )
      throw new WhatsAppValidationError(
        "Choose a date range of up to one year.",
      );
    return { start, end };
  }
  if (!["today", "week", "month", "year"].includes(period))
    throw new WhatsAppValidationError("Choose a valid reporting period.");
  return { start: periodStart(period, now), end: now };
}
export async function report(params: URLSearchParams) {
  const now = new Date();
  const { start, end } = reportRange(params, now);
  const site = params.get("site") || "";
  if (site && !sites.includes(site as (typeof sites)[number]))
    throw new WhatsAppValidationError("Choose a valid website.");
  const audience = params.get("audience") === "support" ? "support" : "sales";
  const siteFilter = site ? Prisma.sql`AND site=${site}` : Prisma.empty;
  const leadStatus =
    audience === "support"
      ? Prisma.sql`status='SUPPORT'`
      : Prisma.sql`status IN ('NEW','QUALIFIED','WON','LOST')`;
  const lookup = (params.get("lookup") || "").trim().slice(0, 80);
  const needle = "%" + lookup.replace(/[\\%_]/g, "") + "%";
  const page = Math.max(1, Math.min(100000, Number(params.get("page")) || 1));
  const offset = (Math.floor(page) - 1) * 20;
  const cards = await Promise.all(
    ["today", "week", "month", "year"].map(async (period) => {
      const since = periodStart(period, now);
      const [clicks, leads] = await Promise.all([
        prisma.$queryRaw<
          Array<{ n: bigint }>
        >`SELECT COUNT(*) n FROM whatsapp_clicks WHERE createdAt >= ${since} AND createdAt <= ${now} AND audience=${audience} ${siteFilter}`,
        prisma.$queryRaw<
          Array<{ n: bigint }>
        >`SELECT COUNT(*) n FROM whatsapp_leads WHERE receivedAt >= ${since} AND receivedAt <= ${now} AND ${leadStatus} ${siteFilter}`,
      ]);
      return { period, clicks: Number(clicks[0].n), leads: Number(leads[0].n) };
    }),
  );
  const clickWhere = Prisma.sql`createdAt >= ${start} AND createdAt < ${end} AND audience=${audience} ${siteFilter}`;
  const leadWhere = Prisma.sql`receivedAt >= ${start} AND receivedAt < ${end} AND ${leadStatus} ${siteFilter}`;
  const leadListWhere = lookup
    ? Prisma.sql`(phone LIKE ${needle} OR name LIKE ${needle}) ${siteFilter}`
    : leadWhere;
  const [
    totals,
    leadTotals,
    trend,
    pages,
    sources,
    destinations,
    clicks,
    leads,
    leadRecordCount,
  ] = await Promise.all([
    prisma.$queryRaw<
      Array<{ clicks: bigint; sessions: bigint; measurable: bigint }>
    >`SELECT COUNT(*) clicks,COUNT(DISTINCT CONCAT(site,':',sessionId)) sessions,COUNT(sessionId) measurable FROM whatsapp_clicks WHERE ${clickWhere}`,
    prisma.$queryRaw<
      Array<{ leads: bigint }>
    >`SELECT COUNT(*) leads FROM whatsapp_leads WHERE ${leadWhere}`,
    prisma.$queryRaw`SELECT DATE_FORMAT(DATE_ADD(createdAt, INTERVAL 1 HOUR),'%Y-%m-%d') label,COUNT(*) value FROM whatsapp_clicks WHERE ${clickWhere} GROUP BY label ORDER BY label`,
    prisma.$queryRaw`SELECT CONCAT(site, path) label,COUNT(*) value FROM whatsapp_clicks WHERE ${clickWhere} GROUP BY site,path ORDER BY value DESC LIMIT 10`,
    prisma.$queryRaw`SELECT COALESCE(NULLIF(source,''),'Unknown / not measured') label,COUNT(*) value FROM whatsapp_clicks WHERE ${clickWhere} GROUP BY source ORDER BY value DESC LIMIT 10`,
    prisma.$queryRaw`SELECT CONCAT(destination,' · ',placement) label,COUNT(*) value FROM whatsapp_clicks WHERE ${clickWhere} GROUP BY destination,placement ORDER BY value DESC LIMIT 10`,
    prisma.$queryRaw`SELECT id,site,path,service,placement,createdAt FROM whatsapp_clicks WHERE ${clickWhere} ORDER BY createdAt DESC,id DESC LIMIT 20 OFFSET ${offset}`,
    prisma.$queryRaw`SELECT * FROM whatsapp_leads WHERE ${leadListWhere} ORDER BY receivedAt DESC,id DESC LIMIT 20 OFFSET ${offset}`,
    prisma.$queryRaw<
      Array<{ n: bigint }>
    >`SELECT COUNT(*) n FROM whatsapp_leads WHERE ${leadListWhere}`,
  ]);
  // Cohort conversion: only confirmed sales enquiries linked to clicks in this range.
  const matched = await prisma.$queryRaw<
    Array<{ n: bigint }>
  >`SELECT COUNT(*) n FROM whatsapp_clicks WHERE ${clickWhere} AND id IN (SELECT clickId FROM whatsapp_leads WHERE ${leadStatus})`;
  return JSON.parse(
    JSON.stringify(
      {
        cards,
        leadRecordCount: leadRecordCount[0].n,
        totals: totals[0],
        leadCount: leadTotals[0].leads,
        matched: matched[0].n,
        trend,
        pages,
        sources,
        destinations,
        clicks,
        leads,
        page: Math.floor(page),
        start,
        end,
        timezone: "Africa/Lagos",
      },
      (_, v) => (typeof v === "bigint" ? Number(v) : v),
    ),
  );
}

export async function saveLead(body: unknown, adminId: string) {
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success)
    throw new WhatsAppValidationError(
      parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" "),
    );
  const lead = parsed.data;
  if (+new Date(lead.receivedAt) > Date.now() + 60000)
    throw new WhatsAppValidationError(
      "The enquiry date cannot be in the future.",
    );
  return prisma.$transaction(async (tx) => {
    if (lead.clickId) {
      const clicks = await tx.$queryRaw<
        Array<{ site: string; createdAt: Date }>
      >`SELECT site,createdAt FROM whatsapp_clicks WHERE id=${lead.clickId}`;
      if (!clicks[0])
        throw new WhatsAppValidationError(
          "That click reference was not found. Leave it empty if the enquiry cannot be attributed.",
        );
      if (clicks[0].site !== lead.site)
        throw new WhatsAppValidationError(
          "Choose the website belonging to this click reference.",
        );
      if (+new Date(lead.receivedAt) < +clicks[0].createdAt)
        throw new WhatsAppValidationError(
          "The enquiry cannot be earlier than its linked click.",
        );
    }
    const id = lead.id || randomUUID();
    if (lead.id) {
      const changed =
        await tx.$executeRaw`UPDATE whatsapp_leads SET phone=${lead.phone},name=${lead.name},site=${lead.site},status=${lead.status},clickId=${lead.clickId || null},notes=${lead.notes},receivedAt=${new Date(lead.receivedAt)},updatedAt=UTC_TIMESTAMP(3),updatedBy=${adminId} WHERE id=${id}`;
      if (!changed)
        throw new WhatsAppValidationError(
          "Lead not found. Refresh the list and try again.",
        );
    } else {
      await tx.$executeRaw`INSERT INTO whatsapp_leads(id,phone,name,site,status,clickId,notes,receivedAt,createdBy,updatedBy) VALUES(${id},${lead.phone},${lead.name},${lead.site},${lead.status},${lead.clickId || null},${lead.notes},${new Date(lead.receivedAt)},${adminId},${adminId})`;
    }
    return id;
  });
}
