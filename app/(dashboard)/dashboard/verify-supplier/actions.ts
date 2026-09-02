"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import xMail from "@/lib/email/xMail";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

const SETTINGS_KEY = "supplier_verification";
const GUANGZHOU_OFFICE_ADDRESS = "广州市白云区机场路111号建发广场3FB3-1";

const travelResearchOptionSchema = z.object({
  available: z.boolean(),
  route: z.string().trim().min(2).max(1000),
  durationEachWay: z.string().trim().min(1).max(500),
  intercityReturnCny: z.number().min(0).max(1_000_000),
  localTransfersReturnCny: z.number().min(0).max(1_000_000),
  lodgingNights: z.number().int().min(0).max(30),
  lodgingRateCny: z.number().min(0).max(100_000),
  notes: z.string().trim().max(2000),
  sourceUrls: z.array(z.string().url().max(1000)).max(10),
});

const travelResearchResultSchema = z.object({
  destinationResolved: z.string().trim().min(2).max(2000),
  oneWayDistanceKm: z.number().positive().max(20_000),
  pricingAsOf: z.string().trim().min(8).max(40),
  rail: travelResearchOptionSchema,
  flight: travelResearchOptionSchema,
  privateCar: travelResearchOptionSchema,
  recommendedMode: z.enum(["HIGH_SPEED_RAIL", "FLIGHT", "PRIVATE_CAR"]),
  recommendationRationale: z.string().trim().min(10).max(3000),
  researchSummary: z.string().trim().min(10).max(5000),
});

const travelResearchJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "destinationResolved",
    "oneWayDistanceKm",
    "pricingAsOf",
    "rail",
    "flight",
    "privateCar",
    "recommendedMode",
    "recommendationRationale",
    "researchSummary",
  ],
  properties: {
    destinationResolved: { type: "string" },
    oneWayDistanceKm: { type: "number" },
    pricingAsOf: { type: "string" },
    rail: travelOptionJsonSchema(),
    flight: travelOptionJsonSchema(),
    privateCar: travelOptionJsonSchema(),
    recommendedMode: {
      type: "string",
      enum: ["HIGH_SPEED_RAIL", "FLIGHT", "PRIVATE_CAR"],
    },
    recommendationRationale: { type: "string" },
    researchSummary: { type: "string" },
  },
} as const;

function travelOptionJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "available",
      "route",
      "durationEachWay",
      "intercityReturnCny",
      "localTransfersReturnCny",
      "lodgingNights",
      "lodgingRateCny",
      "notes",
      "sourceUrls",
    ],
    properties: {
      available: { type: "boolean" },
      route: { type: "string" },
      durationEachWay: { type: "string" },
      intercityReturnCny: { type: "number" },
      localTransfersReturnCny: { type: "number" },
      lodgingNights: { type: "integer" },
      lodgingRateCny: { type: "number" },
      notes: { type: "string" },
      sourceUrls: { type: "array", items: { type: "string" } },
    },
  } as const;
}

async function currentAdmin() {
  const token = (await cookies()).get("token")?.value;
  const payload = token
    ? (verifyToken(token) as { pidUser?: string } | null)
    : null;
  if (!payload?.pidUser) throw new Error("Unauthorized");
  const admin = await prisma.admin.findUnique({
    where: { pidUser: payload.pidUser },
    select: { pidUser: true, userEmail: true, userFirstname: true },
  });
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

function eventId() {
  return `SVE${Date.now().toString(36).toUpperCase()}${randomBytes(5).toString("hex").toUpperCase()}`;
}

async function addEvent(input: {
  requestId: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  message?: string | null;
  visibility?: "CUSTOMER" | "INTERNAL";
  actorId: string;
  actorEmail: string;
}) {
  await prisma.supplier_verification_events.create({
    data: {
      pidEvent: eventId(),
      requestId: input.requestId,
      eventType: input.eventType,
      fromStatus: input.fromStatus || null,
      toStatus: input.toStatus || null,
      message: input.message || null,
      visibility: input.visibility || "CUSTOMER",
      actorId: input.actorId,
      actorEmail: input.actorEmail,
    },
  });
}

async function notifyCustomer(
  requestId: string,
  subject: string,
  message: string,
) {
  const item = await prisma.verify_supplier.findUnique({
    where: { pidVerifySupplier: requestId },
  });
  if (!item?.userEmail) return;
  await xMail({
    xEmail: item.userEmail,
    xTitle: subject,
    xBodyTitle: "Supplier Verification update",
    xBody1: `Hello ${item.customerName || "Customer"},`,
    xBody2: `${message}<br /><br /><b>Request ID:</b> ${requestId}`,
    xButtonTitle: "Open your request",
    xButtonLink: "https://www.sureimports.com/dashboard/verify-supplier",
  });
}

export async function saveSupplierVerificationSettings(input: unknown) {
  await currentAdmin();
  const parsed = z
    .object({
      feeNaira: z.coerce.number().positive().max(20_000_000),
      feeUsd: z.coerce.number().positive().max(100_000),
      officeAddressChinese: z.string().trim().max(2000),
      officeLatitude: z.union([
        z.literal(""),
        z.coerce.number().min(-90).max(90),
      ]),
      officeLongitude: z.union([
        z.literal(""),
        z.coerce.number().min(-180).max(180),
      ]),
      onlineEnabled: z.boolean(),
      physicalEnabled: z.boolean(),
      quoteValidityDays: z.coerce.number().int().min(1).max(60),
      onlineTurnaroundDays: z.coerce.number().int().min(1).max(60),
      physicalTurnaroundDays: z.coerce.number().int().min(1).max(90),
      defaultLodgingCny: z.coerce.number().min(0).max(100_000),
      travelContingencyPercent: z.coerce.number().int().min(0).max(50),
    })
    .parse(input);
  const settings = await prisma.supplier_verification_settings.upsert({
    where: { settingKey: SETTINGS_KEY },
    update: {
      feeNgnKobo: Math.round(parsed.feeNaira * 100),
      feeUsdCents: Math.round(parsed.feeUsd * 100),
      officeAddressChinese: parsed.officeAddressChinese || null,
      officeLatitude:
        parsed.officeLatitude === "" ? null : parsed.officeLatitude,
      officeLongitude:
        parsed.officeLongitude === "" ? null : parsed.officeLongitude,
      onlineEnabled: parsed.onlineEnabled,
      physicalEnabled: parsed.physicalEnabled,
      quoteValidityDays: parsed.quoteValidityDays,
      onlineTurnaroundDays: parsed.onlineTurnaroundDays,
      physicalTurnaroundDays: parsed.physicalTurnaroundDays,
      defaultLodgingCnyFen: Math.round(parsed.defaultLodgingCny * 100),
      travelContingencyPercent: parsed.travelContingencyPercent,
    },
    create: {
      settingKey: SETTINGS_KEY,
      feeNgnKobo: Math.round(parsed.feeNaira * 100),
      feeUsdCents: Math.round(parsed.feeUsd * 100),
      officeAddressChinese: parsed.officeAddressChinese || null,
      officeLatitude:
        parsed.officeLatitude === "" ? null : parsed.officeLatitude,
      officeLongitude:
        parsed.officeLongitude === "" ? null : parsed.officeLongitude,
      onlineEnabled: parsed.onlineEnabled,
      physicalEnabled: parsed.physicalEnabled,
      quoteValidityDays: parsed.quoteValidityDays,
      onlineTurnaroundDays: parsed.onlineTurnaroundDays,
      physicalTurnaroundDays: parsed.physicalTurnaroundDays,
      defaultLodgingCnyFen: Math.round(parsed.defaultLodgingCny * 100),
      travelContingencyPercent: parsed.travelContingencyPercent,
    },
  });
  revalidatePath("/dashboard/verify-supplier");
  return {
    ok: true,
    feeNaira: settings.feeNgnKobo / 100,
    feeUsd: settings.feeUsdCents / 100,
  };
}

function optionTotal(
  fareCny: number,
  transferCny: number,
  nights: number,
  lodgingRateCny: number,
  contingencyPercent: number,
) {
  const subtotal = fareCny + transferCny + nights * lodgingRateCny;
  return Math.round(subtotal * (1 + contingencyPercent / 100) * 100) / 100;
}

function responseOutputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  return (payload?.output || [])
    .flatMap((item: any) => item?.content || [])
    .map((content: any) => content?.text || "")
    .filter(Boolean)
    .join("\n");
}

function travelResearchPrompt(input: {
  origin: string;
  destination: string;
  contingencyPercent: number;
}) {
  return [
    "You are the travel operations researcher for Sure Imports' China supplier-verification team.",
    `Today is ${new Date().toISOString().slice(0, 10)}. Research a round trip for one staff member from ${input.origin} to ${input.destination} for one on-site supplier visit.`,
    "Use current web research in Chinese and English. Compare: (1) high-speed rail or the best practical train, (2) commercial flight plus ground transfers, and (3) end-to-end taxi/private car.",
    "For every option, research the practical route, current return intercity fare, all local transfers at both ends, travel duration each way, whether lodging is operationally needed, and the current nightly rate for a clean, decent mid-range business hotel near the destination.",
    "All monetary values must be in Chinese yuan (CNY). Use realistic bookable/evidenced prices, not luxury options or implausible promotional minima. Return fares, not one-way fares. Do not include meals or the Supplier Verification service fee.",
    "Use direct operator, booking platform, map, hotel, airport, or railway sources. Put the exact supporting page URLs into each option. Never invent a fare, route, hotel, distance, or URL. If an option cannot be reliably priced, set available=false, use zero for unknown monetary fields, explain why, and do not recommend it.",
    "Recommend the best operational option based on total journey time, transfers, reliability, lodging, and cost—not merely the smallest headline fare.",
    `A ${input.contingencyPercent}% contingency will be applied later by deterministic server code. Do not add contingency yourself.`,
    "The distance should represent the practical primary intercity route one way. Summarize any uncertainty and say which prices must be reconfirmed before booking.",
  ].join("\n\n");
}

export async function researchSupplierTravel(input: unknown) {
  const admin = await currentAdmin();
  const parsed = z
    .object({
      requestId: z.string().min(4),
      destinationAddressChinese: z.string().trim().min(5).max(2000),
    })
    .parse(input);
  const settings = await prisma.supplier_verification_settings.findUnique({
    where: { settingKey: SETTINGS_KEY },
  });
  const origin = settings?.officeAddressChinese || GUANGZHOU_OFFICE_ADDRESS;
  const contingencyPercent = settings?.travelContingencyPercent ?? 10;
  const item = await prisma.verify_supplier.findUnique({
    where: { pidVerifySupplier: parsed.requestId },
    include: {
      payments: {
        where: { status: "paid" },
        select: { paymentPurpose: true },
      },
    },
  });
  if (!item || item.verificationType !== "PHYSICAL")
    throw new Error("Physical verification request not found.");
  const verificationPaid = item.payments.some((payment) =>
    ["VERIFICATION", "LEGACY_COMBINED"].includes(payment.paymentPurpose),
  );
  if (!verificationPaid)
    throw new Error(
      "The customer must pay the standard verification fee before travel research can run.",
    );
  if (!["PENDING", "READY"].includes(item.transportQuoteStatus || ""))
    throw new Error("This physical visit can no longer be researched.");

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured in admin.");
  const model =
    process.env.SUPPLIER_TRAVEL_RESEARCH_MODEL?.trim() || "gpt-5.6-sol";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: "high" },
      tools: [{ type: "web_search" }],
      tool_choice: "required",
      max_tool_calls: 16,
      max_output_tokens: 12_000,
      store: false,
      include: ["web_search_call.action.sources"],
      input: travelResearchPrompt({
        origin,
        destination: parsed.destinationAddressChinese,
        contingencyPercent,
      }),
      text: {
        format: {
          type: "json_schema",
          name: "supplier_travel_research",
          schema: travelResearchJsonSchema,
          strict: true,
        },
      },
    }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Travel research failed (${response.status}): ${detail.slice(0, 500)}`,
    );
  }
  const payload = await response.json();
  if (payload?.status !== "completed")
    throw new Error(
      `Travel research did not complete (${payload?.status || "unknown"}).`,
    );
  const outputText = responseOutputText(payload);
  if (!outputText) throw new Error("Travel research returned no result.");
  let research: z.infer<typeof travelResearchResultSchema>;
  try {
    research = travelResearchResultSchema.parse(JSON.parse(outputText));
  } catch {
    throw new Error("Travel research returned an invalid structured result.");
  }

  const rawOptions = [
    { mode: "HIGH_SPEED_RAIL", label: "High-speed rail", ...research.rail },
    { mode: "FLIGHT", label: "Flight", ...research.flight },
    { mode: "PRIVATE_CAR", label: "Taxi / private car", ...research.privateCar },
  ];
  const options = rawOptions.map((option) => ({
    mode: option.mode,
    label: option.label,
    available: option.available,
    route: option.route,
    duration: option.durationEachWay,
    intercityFareCny: option.intercityReturnCny,
    localTransfersCny: option.localTransfersReturnCny,
    lodgingNights: option.lodgingNights,
    lodgingRateCny: option.lodgingRateCny,
    contingencyCny:
      Math.round(
        (option.intercityReturnCny +
          option.localTransfersReturnCny +
          option.lodgingNights * option.lodgingRateCny) *
          (contingencyPercent / 100) *
          100,
      ) / 100,
    totalCny: optionTotal(
      option.intercityReturnCny,
      option.localTransfersReturnCny,
      option.lodgingNights,
      option.lodgingRateCny,
      contingencyPercent,
    ),
    notes: option.notes,
    sourceUrls: option.sourceUrls,
  }));
  let recommendedMode = research.recommendedMode;
  let selected = options.find(
    (option) => option.mode === recommendedMode && option.available,
  );
  if (!selected) {
    selected = options
      .filter((option) => option.available)
      .sort((a, b) => a.totalCny - b.totalCny)[0];
    if (!selected) throw new Error("Research could not price any viable route.");
    recommendedMode = selected.mode as typeof recommendedMode;
  }
  const generatedAt = new Date();
  const sourceUrls = [...new Set(options.flatMap((option) => option.sourceUrls))];
  const travelEstimateJson = {
    version: 2,
    originAddressChinese: origin,
    destinationAddressChinese: parsed.destinationAddressChinese,
    destinationResolved: research.destinationResolved,
    oneWayDistanceKm: research.oneWayDistanceKm,
    roundTripDistanceKm: research.oneWayDistanceKm * 2,
    recommendedMode,
    recommendationRationale: research.recommendationRationale,
    researchSummary: research.researchSummary,
    contingencyPercent,
    options,
    sourceUrls,
    pricingAsOf: research.pricingAsOf,
    generatedAt: generatedAt.toISOString(),
    researchProvider: "OPENAI_WEB_SEARCH",
    researchModel: payload?.model || model,
    responseId: payload?.id || null,
    usage: payload?.usage || null,
  };

  await prisma.verify_supplier.update({
      where: { pidVerifySupplier: parsed.requestId },
      data: {
        travelEstimateJson,
        recommendedTravelMode: recommendedMode,
        travelLodgingNights: selected.lodgingNights,
        travelEstimateGeneratedAt: generatedAt,
        transportEstimateCnyFen: Math.round(selected.totalCny * 100),
        transportDistanceMeters: Math.round(research.oneWayDistanceKm * 1000),
        transportEstimateSource: "OPENAI_WEB_RESEARCH",
        updatedAt: generatedAt,
      },
  });
  await addEvent({
      requestId: parsed.requestId,
      eventType: "TRAVEL_RESEARCH_COMPLETED",
      message: `Current route research completed: ${selected.label}, approximately ¥${selected.totalCny.toLocaleString()} including lodging and contingency.`,
      visibility: "INTERNAL",
      actorId: admin.pidUser,
      actorEmail: admin.userEmail,
  });
  revalidatePath("/dashboard/verify-supplier");
  return travelEstimateJson;
}

export async function quoteSupplierTransport(input: unknown) {
  const admin = await currentAdmin();
  const parsed = z
    .object({
      requestId: z.string().min(4),
      feeNaira: z.coerce.number().min(0).max(20_000_000),
      feeUsd: z.coerce.number().min(0).max(100_000),
      customerMessage: z.string().trim().max(4000),
    })
    .parse(input);
  const item = await prisma.verify_supplier.findUnique({
    where: { pidVerifySupplier: parsed.requestId },
    include: {
      payments: {
        where: { status: "paid" },
        select: { paymentPurpose: true },
      },
    },
  });
  if (!item || item.verificationType !== "PHYSICAL")
    throw new Error("Physical verification request not found.");
  if (
    !item.payments.some((payment) =>
      ["VERIFICATION", "LEGACY_COMBINED"].includes(payment.paymentPurpose),
    )
  )
    throw new Error(
      "The standard verification fee must be paid before a physical-visit quote can be published.",
    );
  if (!["PENDING", "READY"].includes(item.transportQuoteStatus || ""))
    throw new Error("This request can no longer be quoted.");
  if (
    item.transportEstimateSource !== "OPENAI_WEB_RESEARCH" ||
    !item.travelEstimateJson
  )
    throw new Error("Run current travel research before publishing the quote.");
  const settings = await prisma.supplier_verification_settings.findUnique({
    where: { settingKey: SETTINGS_KEY },
  });
  const expires = new Date();
  expires.setDate(expires.getDate() + (settings?.quoteValidityDays || 7));
  await prisma.verify_supplier.update({
    where: { pidVerifySupplier: parsed.requestId },
    data: {
      transportFeeNgnKobo: Math.round(parsed.feeNaira * 100),
      transportFeeUsdCents: Math.round(parsed.feeUsd * 100),
      transportQuoteStatus: "READY",
      quoteExpiresAt: expires,
      customerMessage:
        parsed.customerMessage ||
        "Your travel and lodging quote is ready. You can now complete payment.",
      updatedAt: new Date(),
    },
  });
  const message =
    parsed.customerMessage ||
    "Your travel and lodging quote is ready. You can now complete payment.";
  await addEvent({
    requestId: parsed.requestId,
    eventType: "TRAVEL_AND_LODGING_QUOTED",
    fromStatus: item.status,
    toStatus: item.status,
    message,
    actorId: admin.pidUser,
    actorEmail: admin.userEmail,
  });
  await notifyCustomer(
    parsed.requestId,
    `Travel and lodging quote ready - ${parsed.requestId}`,
    message,
  );
  revalidatePath("/dashboard/verify-supplier");
  return { ok: true };
}

const allowedTransitions: Record<string, string[]> = {
  PAID: ["IN_REVIEW", "CANCELLED"],
  IN_REVIEW: ["VISIT_SCHEDULED", "REPORT_READY", "CANCELLED"],
  VISIT_SCHEDULED: ["IN_REVIEW", "REPORT_READY", "CANCELLED"],
  REPORT_READY: ["COMPLETED"],
};

export async function updateSupplierVerification(input: unknown) {
  const admin = await currentAdmin();
  const parsed = z
    .object({
      requestId: z.string().min(4),
      status: z.string().min(2),
      message: z.string().trim().max(4000),
      adminNotes: z.string().trim().max(10000),
    })
    .parse(input);
  const item = await prisma.verify_supplier.findUnique({
    where: { pidVerifySupplier: parsed.requestId },
  });
  if (!item) throw new Error("Verification request not found.");
  if (!(allowedTransitions[item.status || ""] || []).includes(parsed.status))
    throw new Error(
      `Cannot move ${item.status || "this request"} to ${parsed.status}.`,
    );
  if (
    parsed.status === "VISIT_SCHEDULED" &&
    (item.verificationType !== "PHYSICAL" ||
      item.transportQuoteStatus !== "PAID")
  )
    throw new Error(
      "A physical visit can only be scheduled after its separate payment is confirmed.",
    );
  await prisma.verify_supplier.update({
    where: { pidVerifySupplier: parsed.requestId },
    data: {
      status: parsed.status,
      customerMessage: parsed.message || null,
      adminNotes: parsed.adminNotes || null,
      assignedTo: item.assignedTo || admin.pidUser,
      completedAt:
        parsed.status === "COMPLETED" ? new Date() : item.completedAt,
      updatedAt: new Date(),
    },
  });
  const message =
    parsed.message ||
    `Your Supplier Verification request is now ${parsed.status.toLowerCase().replaceAll("_", " ")}.`;
  await addEvent({
    requestId: parsed.requestId,
    eventType: "STATUS_UPDATED",
    fromStatus: item.status,
    toStatus: parsed.status,
    message,
    actorId: admin.pidUser,
    actorEmail: admin.userEmail,
  });
  if (parsed.adminNotes)
    await addEvent({
      requestId: parsed.requestId,
      eventType: "INTERNAL_NOTE",
      message: parsed.adminNotes,
      visibility: "INTERNAL",
      actorId: admin.pidUser,
      actorEmail: admin.userEmail,
    });
  await notifyCustomer(
    parsed.requestId,
    `Supplier Verification update - ${parsed.requestId}`,
    message,
  );
  revalidatePath("/dashboard/verify-supplier");
  return { ok: true };
}

export async function publishSupplierVerificationReport(input: unknown) {
  const admin = await currentAdmin();
  const parsed = z
    .object({
      requestId: z.string().min(4),
      outcome: z.enum(["LOW_RISK", "CAUTION", "HIGH_RISK", "INCONCLUSIVE"]),
      summary: z.string().trim().min(30).max(20000),
      reportUrl: z.union([
        z.literal(""),
        z
          .string()
          .url()
          .max(1000)
          .refine(
            (value) => /^https:\/\//i.test(value),
            "Use a secure HTTPS URL.",
          ),
      ]),
    })
    .parse(input);
  const item = await prisma.verify_supplier.findUnique({
    where: { pidVerifySupplier: parsed.requestId },
  });
  if (
    !item ||
    !["IN_REVIEW", "VISIT_SCHEDULED", "REPORT_READY"].includes(
      item.status || "",
    )
  )
    throw new Error("This request is not ready for a report.");
  await prisma.verify_supplier.update({
    where: { pidVerifySupplier: parsed.requestId },
    data: {
      reportOutcome: parsed.outcome,
      reportSummary: parsed.summary,
      reportUrl: parsed.reportUrl || null,
      status: "REPORT_READY",
      customerMessage: "Your Supplier Verification report is ready.",
      updatedAt: new Date(),
    },
  });
  await addEvent({
    requestId: parsed.requestId,
    eventType: "REPORT_PUBLISHED",
    fromStatus: item.status,
    toStatus: "REPORT_READY",
    message: "Your Supplier Verification report is ready.",
    actorId: admin.pidUser,
    actorEmail: admin.userEmail,
  });
  await notifyCustomer(
    parsed.requestId,
    `Supplier Verification report ready - ${parsed.requestId}`,
    "Your Supplier Verification report is ready in your dashboard.",
  );
  revalidatePath("/dashboard/verify-supplier");
  return { ok: true };
}
