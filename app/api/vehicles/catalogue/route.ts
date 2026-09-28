import { prisma } from "@/lib/prisma";
import { vehicleAdmin } from "@/lib/vehicles/access";
import { vehicleCatalogue, vehicleRates } from "@/lib/vehicles/data";
import { sameOrigin, inputText } from "@/lib/vehicles/http";
import { youtubeId, type VehicleModel } from "@/lib/vehicles/policy";
import seeds from "@/lib/vehicles/catalogue.json";

export async function GET() {
  if (!(await vehicleAdmin()))
    return Response.json({ message: "Access denied" }, { status: 403 });
  const [models, rates] = await Promise.all([
    vehicleCatalogue(),
    vehicleRates(),
  ]);
  return Response.json(
    { models, rates, canEditPricing: !!(await vehicleAdmin(true, true)) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  const admin = await vehicleAdmin(true);
  if (!admin)
    return Response.json({ message: "Access denied" }, { status: 403 });
  try {
    sameOrigin(request);
    const body = await request.json();
    if (body.action === "import") {
      await prisma.$transaction(
        seeds.map((model) =>
          prisma.vehicle_models.upsert({
            where: { slug: model.slug },
            create: { ...model, updatedBy: admin.pidUser },
            update: {},
          }),
        ),
      );
      return Response.json({ ok: true });
    }
    const m = body.model as VehicleModel;
    const slug = inputText(m.slug, "slug", 100);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      throw new Error("Use a lowercase URL slug.");
    const name = inputText(m.name, "model name", 160);
    const category = inputText(m.category, "category", 60);
    const description = inputText(m.description, "description", 5000);
    if (!["Electric", "Hybrid", "Petrol", "Diesel"].includes(m.powertrain))
      throw new Error("Choose a supported powertrain.");
    if (
      !Array.isArray(m.variants) ||
      !m.variants.length ||
      m.variants.length > 100
    )
      throw new Error("Add between 1 and 100 configurations.");
    if (new Set(m.variants.map((v) => v.id)).size !== m.variants.length)
      throw new Error("Configuration IDs must be unique.");
    const variants = m.variants.map((v) => {
      inputText(v.id, "configuration ID", 100);
      inputText(v.name, "configuration name", 160);
      for (const key of [
        "manufacturerRmb",
        "lengthMm",
        "widthMm",
        "heightMm",
        "batteryKwh",
        "rangeKm",
        "seats",
        "cargoM3",
      ] as const)
        if (
          v[key] !== null &&
          (typeof v[key] !== "number" ||
            !Number.isFinite(v[key]) ||
            v[key]! <= 0 ||
            v[key]! > 10000000)
        )
          throw new Error(`Invalid ${key} for ${v.name}.`);
      if (v.priceConfirmed && !v.manufacturerRmb)
        throw new Error(
          `Add a manufacturer price before confirming ${v.name}.`,
        );
      if (
        v.specificationsConfirmed &&
        (!v.lengthMm || !v.widthMm || !v.heightMm)
      )
        throw new Error(`Exterior dimensions are required for ${v.name}.`);
      return {
        id: v.id,
        name: v.name,
        manufacturerRmb: v.manufacturerRmb,
        lengthMm: v.lengthMm,
        widthMm: v.widthMm,
        heightMm: v.heightMm,
        batteryKwh: v.batteryKwh,
        rangeKm: v.rangeKm,
        seats: v.seats,
        cargoM3: v.cargoM3,
        rangeStandard: inputText(
          v.rangeStandard || "",
          "range standard",
          80,
          false,
        ),
        source: inputText(v.source || "", "source", 500, false),
        priceConfirmed: v.priceConfirmed === true,
        specificationsConfirmed: v.specificationsConfirmed === true,
      };
    });
    if (
      !Array.isArray(m.images) ||
      m.images.length > 30 ||
      !m.images.every(
        (u) =>
          typeof u === "string" && /^https:\/\/res\.cloudinary\.com\//.test(u),
      )
    )
      throw new Error("Use Cloudinary image URLs or upload photos here.");
    if (
      !Array.isArray(m.youtubeUrls) ||
      m.youtubeUrls.length > 10 ||
      !m.youtubeUrls.every(youtubeId)
    )
      throw new Error("Enter valid YouTube links.");
    const data = {
      name,
      category,
      description,
      powertrain: m.powertrain,
      images: m.images,
      youtubeUrls: m.youtubeUrls,
      variants,
      published: m.published === true,
      updatedBy: admin.pidUser,
    };
    await prisma.vehicle_models.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ message: (e as Error).message }, { status: 400 });
  }
}
