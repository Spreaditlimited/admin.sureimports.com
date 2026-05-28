import { db } from "@/lib/db"; // Assuming your shared prisma instance is here
import ServiceChargeForm from "./components/ServiceChargeForm";

export default async function DashboardPage() {
  /**
   * Fetch the global configuration record.
   * We retrieve the record with ID: 1 as it serves as the system's 
   * source of truth for exchange rates and service fees.
   */
  const rateRecord = await db.exchange_rate.findUnique({
    where: {
      id: 1,
    },
  });

  const rates = {
    service_charge: Number(rateRecord?.service_charge ?? 0),
    vat: Number(rateRecord?.vat ?? 0),
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Service Charges
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure global platform fees, procurement surcharges, and tax percentages.
        </p>
      </div>

      {/* Page Content */}
      <ServiceChargeForm rates={rates} />
      
    </div>
  );
}
