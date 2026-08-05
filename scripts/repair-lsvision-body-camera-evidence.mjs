import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [supplier] = await prisma.$queryRawUnsafe(
    `SELECT pidSupplier, supplierName
     FROM intelligence_suppliers
     WHERE supplierName = ?
     LIMIT 1`,
    "Shenzhen LS VISION Technology Co., Ltd.",
  );
  if (!supplier) throw new Error("LS VISION supplier record was not found.");

  await prisma.$executeRawUnsafe(
    `UPDATE intelligence_suppliers
     SET productFit = ?, productsMade = ?, buyerNotes = ?, verifiedFrom = ?,
         lastVerifiedAt = ?, updatedAt = ?
     WHERE pidSupplier = ?`,
    "Police, security and field-operation body-worn camera programmes requiring 3G/4G connectivity, GPS, Wi-Fi, IP68 housings, face-recognition options and multi-unit docking stations.",
    JSON.stringify([
      "3G and 4G police body-worn cameras",
      "GPS and Wi-Fi body cameras",
      "IP68 wearable video recorders",
      "Face-recognition body cameras",
      "Multi-unit body-camera docking stations",
    ]),
    "Shenzhen LS VISION Technology Co., Ltd. is included as a direct manufacturer of police body-worn cameras, wearable video recorders and compatible docking stations. Its official product pages document GPS, Wi-Fi, 3G/4G and IP68 configurations for enforcement and security use. For a high-value or specification-sensitive order, Sure Imports strongly recommends physical factory verification and pre-shipment testing by our China team before substantial funds are committed.",
    "https://www.lsvisionhd.com/ru/product/lsvision-ls-vision-new-3g-4g-gps-wifi-ip68-police-body-worn-camera-with-docking-station-support-face-recognition-body-worn-camera/",
    new Date(),
    new Date(),
    supplier.pidSupplier,
  );

  console.log(JSON.stringify({ updated: supplier.pidSupplier, supplier: supplier.supplierName }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
