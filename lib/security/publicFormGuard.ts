import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyRecaptchaToken } from "./recaptcha";
import { publicFormError } from "./publicFormPolicy";

type Options = {
  scope: string;
  action?: string;
  signup?: boolean;
  ipMax?: number;
  identityMax?: number;
};

function reject(message: string, status: number): Response {
  return Response.json(
    {
      ok: false,
      success: false,
      successx: false,
      error: message,
      message,
      messagex: { message1: message },
      responsex: { message },
      statusx: "SECURITY_REJECTED",
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "900" } : {}),
      },
    },
  );
}

async function consume(
  scope: string,
  value: string,
  maximum: number,
): Promise<boolean> {
  const scopeHash = createHash("sha256")
    .update(`public-form:v1:${scope}:${value}`)
    .digest("hex");
  const bucketStart = new Date(Math.floor(Date.now() / 900000) * 900000);
  // Atomic database increment: shared by every server instance, with no lost updates.
  await prisma.$executeRaw`INSERT INTO intelligence_report_checkout_rate_limits
    (scopeHash, bucketStart, attempts, createdAt, updatedAt)
    VALUES (${scopeHash}, ${bucketStart}, 1, NOW(), NOW())
    ON DUPLICATE KEY UPDATE attempts = attempts + 1, updatedAt = NOW()`;
  const rows = await prisma.$queryRaw<
    Array<{ attempts: number }>
  >`SELECT attempts FROM intelligence_report_checkout_rate_limits
    WHERE scopeHash = ${scopeHash} AND bucketStart = ${bucketStart}`;
  return Number(rows[0]?.attempts) <= maximum;
}

/** Called before account writes, password hashing, or email sends. */
export async function guardPublicForm(
  request: Request,
  options: Options,
): Promise<Response | null> {
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).origin !== new URL(request.url).origin)
      return reject("Invalid request origin.", 403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      return reject("Expected a JSON request.", 415);
    const reader = request.clone().body?.getReader();
    if (!reader) return reject("Request body is required.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16384) {
        void reader.cancel();
        return reject("Request is too large.", 413);
      }
      chunks.push(value);
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return reject("Invalid JSON request.", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return reject("Invalid request.", 400);
    const invalid = publicFormError(body, !!options.signup);
    if (invalid) return reject(invalid, 400);
    const ip = (
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown"
    )
      .trim()
      .slice(0, 64);
    const identity = String(body.email ?? body.userEmail ?? body.login ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 254);
    if (!(await consume(`${options.scope}:ip`, ip, options.ipMax ?? 15)))
      return reject("Too many attempts. Please try again in 15 minutes.", 429);
    if (
      identity &&
      !(await consume(
        `${options.scope}:identity`,
        identity,
        options.identityMax ?? 4,
      ))
    )
      return reject("Too many attempts. Please try again in 15 minutes.", 429);
    if (
      options.action &&
      !(await verifyRecaptchaToken(
        (body.recaptchaToken ?? body.captchaToken) as string,
        request,
        options.action,
      ))
    ) {
      return reject(
        "Security verification failed. Please refresh and try again.",
        400,
      );
    }
    return null;
  } catch {
    // A storage/provider outage must not disable protection.
    return reject(
      "Security verification is temporarily unavailable. Please try again shortly.",
      503,
    );
  }
}
