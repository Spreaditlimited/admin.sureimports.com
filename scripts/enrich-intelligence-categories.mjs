import jwt from "jsonwebtoken";
import http from "node:http";
import https from "node:https";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.INTELLIGENCE_ADMIN_URL || "http://localhost:3011";
const minimumSupplierCount = 10;
const maxAttemptsPerCategory = 4;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

async function adminCookie() {
  const admin = await prisma.admin.findFirst({
    where: { OR: [{ userStatus: "superadmin" }, { userStatus: "L1" }] },
    select: { pidUser: true, userEmail: true, userFirstname: true },
  });
  if (!admin) throw new Error("No super-admin account is available.");
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured.");
  const token = jwt.sign(admin, process.env.JWT_SECRET, { expiresIn: "1d" });
  return `token=${token}`;
}

async function requestJson(path, cookie, options = {}) {
  const url = new URL(path, baseUrl);
  const body = options.body || null;
  const transport = url.protocol === "https:" ? https : http;
  const result = await new Promise((resolve, reject) => {
    const request = transport.request(
      url,
      {
        method: options.method || "GET",
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
          ...(options.headers || {}),
          cookie,
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let data = {};
          try {
            data = JSON.parse(text);
          } catch {}
          resolve({ status: response.statusCode || 500, data });
        });
      },
    );
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
  if (result.status < 200 || result.status >= 300 || !result.data?.success) {
    throw new Error(
      result.data?.error || result.data?.message || `Request failed: ${result.status}`,
    );
  }
  return result.data;
}

async function categories(cookie) {
  return (await requestJson("/api/intelligence/categories", cookie)).data || [];
}

function exclusionNotes(category, shortfall) {
  const existing = category.suppliers
    .map((supplier) => `${supplier.supplierName} (${supplier.officialWebsite || "no website"})`)
    .join("; ");
  return [
    `Find ${shortfall} additional, unique direct manufacturers for the exact category “${category.name}”.`,
    "Do not return distributors, traders, marketplaces, sourcing agents or brand retailers without their own manufacturing evidence.",
    "Every candidate must specifically manufacture products in this exact category and must pass all configured official-site and attributable public WhatsApp rules.",
    `Exclude these suppliers already approved for this category: ${existing}.`,
  ].join("\n");
}

async function researchAndApprove(category, cookie) {
  const shortfall = minimumSupplierCount - category.suppliers.length;
  const targetSupplierCount = Math.max(3, Math.min(10, shortfall));
  const research = await requestJson("/api/intelligence/research", cookie, {
    method: "POST",
    body: JSON.stringify({
      nicheName: category.name,
      targetSupplierCount,
      requestNotes: exclusionNotes(category, shortfall),
    }),
  });
  const job = (research.data || [])
    .filter(
      (candidate) =>
        normalize(candidate.nicheName) === normalize(category.name) &&
        candidate.status === "awaiting_approval",
    )
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0];
  if (!job) throw new Error("Research completed without an approval draft.");

  const draft =
    typeof job.draftJson === "string" ? JSON.parse(job.draftJson) : job.draftJson;
  const candidates = Array.isArray(draft?.suppliers) ? draft.suppliers.length : 0;
  if (!candidates) throw new Error("Research draft contains no eligible suppliers.");

  await requestJson("/api/intelligence/research", cookie, {
    method: "PATCH",
    body: JSON.stringify({ pidJob: job.pidJob, action: "approve" }),
  });
  return { pidJob: job.pidJob, candidates };
}

async function main() {
  const cookie = await adminCookie();
  const initial = await categories(cookie);
  const requestedSlugs = new Set(
    String(process.env.INTELLIGENCE_CATEGORY_SLUGS || "")
      .split(",")
      .map((value) => normalize(value))
      .filter(Boolean),
  );
  const isRequested = (category) =>
    requestedSlugs.size === 0 || requestedSlugs.has(normalize(category.slug));
  const queue = initial.filter(
    (category) =>
      isRequested(category) && category.suppliers.length < minimumSupplierCount,
  );
  console.log(
    JSON.stringify({ event: "start", categories: initial.length, queued: queue.length }),
  );

  const failures = [];
  async function processCategory(index) {
    const categoryName = queue[index].name;
    let attempts = 0;
    let previousCount = -1;
    while (attempts < maxAttemptsPerCategory) {
      const liveCategories = await categories(cookie);
      const category = liveCategories.find(
        (candidate) => normalize(candidate.name) === normalize(categoryName),
      );
      if (!category) {
        failures.push({ category: categoryName, error: "Category disappeared." });
        break;
      }
      const currentCount = category.suppliers.length;
      if (currentCount >= minimumSupplierCount) {
        console.log(
          JSON.stringify({
            event: "complete",
            position: index + 1,
            total: queue.length,
            category: categoryName,
            count: currentCount,
          }),
        );
        break;
      }
      if (attempts > 0 && currentCount <= previousCount) {
        failures.push({
          category: categoryName,
          error: `No supplier-count progress after ${attempts} attempt(s).`,
          count: currentCount,
        });
        break;
      }
      previousCount = currentCount;
      attempts += 1;
      console.log(
        JSON.stringify({
          event: "research",
          position: index + 1,
          total: queue.length,
          category: categoryName,
          count: currentCount,
          shortfall: minimumSupplierCount - currentCount,
          attempt: attempts,
        }),
      );
      try {
        const result = await researchAndApprove(category, cookie);
        console.log(
          JSON.stringify({
            event: "approved",
            category: categoryName,
            candidates: result.candidates,
            pidJob: result.pidJob,
          }),
        );
      } catch (error) {
        failures.push({ category: categoryName, error: error.message, count: currentCount });
        console.log(
          JSON.stringify({ event: "failed", category: categoryName, error: error.message }),
        );
        break;
      }
    }
  }

  const concurrency = Math.max(
    1,
    Math.min(4, Number(process.env.INTELLIGENCE_RESEARCH_CONCURRENCY || 1)),
  );
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < queue.length) {
      const index = nextIndex;
      nextIndex += 1;
      await processCategory(index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()),
  );

  const finalCategories = await categories(cookie);
  const remaining = finalCategories
    .filter(
      (category) =>
        isRequested(category) && category.suppliers.length < minimumSupplierCount,
    )
    .map((category) => ({ name: category.name, count: category.suppliers.length }));
  console.log(
    JSON.stringify({
      event: "finished",
      categories: finalCategories.length,
      complete: finalCategories.length - remaining.length,
      remaining,
      failures,
    }),
  );
  if (remaining.length) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ event: "fatal", error: error.message }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
