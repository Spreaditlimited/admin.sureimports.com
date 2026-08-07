import jwt from "jsonwebtoken";
import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.INTELLIGENCE_ADMIN_URL || "http://localhost:3011";
const outputDirectory = "/tmp/sureimports-intelligence-batch";
const requestedSlugs = String(process.env.INTELLIGENCE_REPORT_SLUGS || "")
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);

async function adminCookie() {
  const admin = await prisma.admin.findFirst({
    where: { OR: [{ userStatus: "superadmin" }, { userStatus: "L1" }] },
    select: { pidUser: true, userEmail: true, userFirstname: true },
  });
  if (!admin || !process.env.JWT_SECRET) throw new Error("Admin authentication is unavailable.");
  return `token=${jwt.sign(admin, process.env.JWT_SECRET, { expiresIn: "1d" })}`;
}

function request(path, cookie, options = {}) {
  const url = new URL(path, baseUrl);
  const body = options.body ? JSON.stringify(options.body) : null;
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers: {
          cookie,
          ...(body
            ? {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(body),
              }
            : {}),
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode || 500,
            contentType: String(response.headers["content-type"] || ""),
            buffer: Buffer.concat(chunks),
          }),
        );
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function json(result) {
  try {
    return JSON.parse(result.buffer.toString("utf8"));
  } catch {
    return {};
  }
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const cookie = await adminCookie();
  const pricing = await prisma.intelligence_report_price_settings.findUnique({
    where: { settingKey: "manufacturer_reports" },
  });
  if (!pricing) throw new Error("Manufacturer report pricing is not configured.");
  const reports = await prisma.intelligence_report_products.findMany({
    where: {
      supplierCount: { gte: 10 },
      priceNaira: pricing.priceNaira,
      priceUsdCents: pricing.priceUsdCents,
      ...(requestedSlugs.length ? { slug: { in: requestedSlugs } } : {}),
    },
    orderBy: { slug: "asc" },
  });
  const expectedCount = requestedSlugs.length || 25;
  if (reports.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} prepared reports; found ${reports.length}.`);
  }

  const generated = [];
  const failures = [];
  for (const [index, report] of reports.entries()) {
    const response = await request(
      `/api/intelligence/reports/${report.pidReport}/generate`,
      cookie,
      { method: "POST" },
    );
    const payload = json(response);
    if (response.status !== 200 || !payload.success) {
      failures.push({ slug: report.slug, error: payload.error || `HTTP ${response.status}` });
      console.log(JSON.stringify({ event: "failed", slug: report.slug, error: failures.at(-1).error }));
      continue;
    }

    const version = payload.data;
    const preview = await request(
      `/api/intelligence/reports/${report.pidReport}/preview?versionId=${version.pidVersion}`,
      cookie,
    );
    const validPdf =
      preview.status === 200 &&
      preview.contentType.includes("application/pdf") &&
      preview.buffer.subarray(0, 5).toString("ascii") === "%PDF-" &&
      preview.buffer.length > 250_000;
    if (!validPdf) {
      failures.push({ slug: report.slug, error: "Generated file failed PDF integrity or size checks." });
      console.log(JSON.stringify({ event: "failed", slug: report.slug, error: failures.at(-1).error }));
      continue;
    }
    await writeFile(`${outputDirectory}/${report.slug}.pdf`, preview.buffer);
    generated.push({
      slug: report.slug,
      pidReport: report.pidReport,
      pidVersion: version.pidVersion,
      supplierCount: version.supplierCount,
      bytes: preview.buffer.length,
    });
    console.log(JSON.stringify({ event: "generated", progress: `${index + 1}/${reports.length}`, ...generated.at(-1) }));
  }

  let finalGenerated = generated;
  let finalFailures = failures;
  if (requestedSlugs.length) {
    try {
      const previous = JSON.parse(
        await readFile(`${outputDirectory}/manifest.json`, "utf8"),
      );
      const retried = new Set(requestedSlugs);
      finalGenerated = [
        ...(previous.generated || []).filter((entry) => !retried.has(entry.slug)),
        ...generated,
      ].sort((a, b) => a.slug.localeCompare(b.slug));
      finalFailures = [
        ...(previous.failures || []).filter((entry) => !retried.has(entry.slug)),
        ...failures,
      ].sort((a, b) => a.slug.localeCompare(b.slug));
    } catch {
      // A partial run without a prior manifest remains a valid diagnostic run.
    }
  }
  await writeFile(
    `${outputDirectory}/manifest.json`,
    JSON.stringify({ generated: finalGenerated, failures: finalFailures }, null, 2),
  );
  console.log(JSON.stringify({
    event: "complete",
    generated: generated.length,
    failed: failures.length,
    manifestGenerated: finalGenerated.length,
    manifestFailed: finalFailures.length,
  }));
  if (failures.length) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
