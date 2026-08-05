import jwt from "jsonwebtoken";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.INTELLIGENCE_ADMIN_URL || "http://localhost:3011";
const manifestPath = "/tmp/sureimports-intelligence-batch/manifest.json";

async function adminCookie() {
  const admin = await prisma.admin.findFirst({
    where: { OR: [{ userStatus: "superadmin" }, { userStatus: "L1" }] },
    select: { pidUser: true, userEmail: true, userFirstname: true },
  });
  if (!admin || !process.env.JWT_SECRET) throw new Error("Admin authentication is unavailable.");
  return `token=${jwt.sign(admin, process.env.JWT_SECRET, { expiresIn: "1d" })}`;
}

function publish(path, cookie, body) {
  const url = new URL(path, baseUrl);
  const encoded = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json",
        "content-length": Buffer.byteLength(encoded),
      },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let data = {};
        try { data = JSON.parse(text); } catch {}
        resolve({ status: response.statusCode || 500, data });
      });
    });
    req.on("error", reject);
    req.write(encoded);
    req.end();
  });
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.failures?.length || manifest.generated?.length !== 23) {
    throw new Error("Publication blocked: the generation manifest does not contain 23 passing editions.");
  }
  const cookie = await adminCookie();
  let published = 0;
  for (const item of manifest.generated) {
    const result = await publish(
      `/api/intelligence/reports/${item.pidReport}/publish`,
      cookie,
      { versionId: item.pidVersion },
    );
    if (result.status !== 200 || !result.data?.success) {
      throw new Error(`${item.slug}: ${result.data?.error || `HTTP ${result.status}`}`);
    }
    published += 1;
    console.log(JSON.stringify({ event: "published", progress: `${published}/23`, slug: item.slug }));
  }
  const live = await prisma.intelligence_report_products.count({
    where: {
      status: "published",
      currentVersionId: { not: null },
      supplierCount: { gte: 10 },
      priceNaira: 25_000,
      priceUsdCents: 5_000,
    },
  });
  console.log(JSON.stringify({ event: "complete", published, live }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
