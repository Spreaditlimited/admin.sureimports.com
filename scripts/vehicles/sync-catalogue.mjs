// Run after BOTH applications have the USD-aware pricing code deployed.
// Default is a read-only plan. --apply backs up the rows before an atomic import.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(path.join(root, "package.json"));
require("@next/env").loadEnvConfig(root, true, { info() {}, error() {} });
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const seeds = JSON.parse(
  readFileSync(path.join(root, "lib/vehicles/catalogue.json"), "utf8"),
);
const apply = process.argv.includes("--apply");
try {
  const rows = await db.vehicle_models.findMany();
  const bySlug = new Map(rows.map((m) => [m.slug, m]));
  const plan = seeds.map((seed) => {
    const current = bySlug.get(seed.slug);
    const images = [...new Set([...(current?.images || []), ...seed.images])];
    if (images.length > 30)
      throw new Error(
        `${seed.slug}: review the gallery limit before importing.`,
      );
    return {
      seed,
      current,
      images,
      action: !current
        ? "create"
        : images.length > current.images.length
          ? "append photos"
          : "unchanged",
    };
  });
  console.table(
    plan.map((p) => ({
      model: p.seed.slug,
      action: p.action,
      photos: p.images.length,
    })),
  );
  if (apply) {
    const backup = path.join(
      os.tmpdir(),
      `vehicle-catalogue-before-${Date.now()}.json`,
    );
    writeFileSync(backup, JSON.stringify(rows, null, 2) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    console.log(`Backup: ${backup}`);
    await db.$transaction(
      async (tx) => {
        for (const p of plan) {
          if (!p.current) await tx.vehicle_models.create({ data: p.seed });
          else if (p.action !== "unchanged") {
            const result = await tx.vehicle_models.updateMany({
              where: { slug: p.current.slug, updatedAt: p.current.updatedAt },
              data: { images: p.images },
            });
            if (result.count !== 1)
              throw new Error(
                `Concurrent edit to ${p.current.slug}; import rolled back. Rerun to refresh the plan.`,
              );
          }
        }
      },
      { timeout: 30000 },
    );
    console.log(
      "Imported. Existing prices, variants, publication settings and orders preserved.",
    );
  } else
    console.log(
      "Read-only plan. Deploy both applications before running with --apply.",
    );
} finally {
  await db.$disconnect();
}
