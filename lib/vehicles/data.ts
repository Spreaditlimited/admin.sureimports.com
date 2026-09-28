import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import catalogue from "./catalogue.json";
import {
  canQuote,
  priceVehicle,
  type Rates,
  type VehicleModel,
} from "./policy";

export const vehicleCatalogue = cache(async function vehicleCatalogue() {
  if (process.env.VEHICLE_CATALOGUE_PREVIEW === "1")
    return catalogue as VehicleModel[];
  try {
    const rows = await prisma.vehicle_models.findMany({
      orderBy: { createdAt: "asc" },
    });
    return rows.length
      ? (rows as unknown as VehicleModel[])
      : (catalogue as VehicleModel[]);
  } catch (error) {
    // A pre-migration preview may show the supplied range, but cannot accept orders.
    if ((error as { code?: string }).code === "P2021")
      return catalogue as VehicleModel[];
    throw error;
  }
});
export async function vehicleRates(): Promise<Rates> {
  if (process.env.VEHICLE_CATALOGUE_PREVIEW === "1")
    return { ngnPerRmb: 0, ngnPerCbm: 0 };
  const row = await prisma.exchange_rate.findUnique({
    where: { id: 1 },
    select: { exNairaToYuan: true, quotationSeaRateNgnPerCbm: true },
  });
  return {
    ngnPerRmb: Number(row?.exNairaToYuan || 0),
    ngnPerCbm: Number(row?.quotationSeaRateNgnPerCbm || 0),
  };
}
export function publicVehicle(model: VehicleModel, rates: Rates) {
  return {
    slug: model.slug,
    name: model.name,
    category: model.category,
    powertrain: model.powertrain,
    description: model.description,
    images: model.images,
    youtubeUrls: model.youtubeUrls,
    variants: model.variants.map((v) => {
      const {
        manufacturerRmb: _cost,
        source: _source,
        priceConfirmed: _price,
        specificationsConfirmed: _specs,
        ...spec
      } = v;
      return {
        ...spec,
        price: canQuote(v, rates) ? priceVehicle(v, rates) : null,
      };
    }),
  };
}
export type PublicVehicle = ReturnType<typeof publicVehicle>;
