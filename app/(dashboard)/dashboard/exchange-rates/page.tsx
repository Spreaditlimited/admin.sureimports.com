import { db } from "@/lib/db"; // Assuming your prisma instance is exported here
import ExchangeRatesForm from "./components/ExchageRatesForm";

export default async function DashboardPage() {
  // Fetch the global exchange rate configuration (ID: 1)
  // Using 'db' utility for consistency with your other server components
  const rateRecord = await db.exchange_rate.findUnique({
    where: {
      id: 1,
    },
  });

  const rates = {
    exNairaToDollar: Number(rateRecord?.exNairaToDollar ?? 0),
    exYuanToDollar: Number(rateRecord?.exYuanToDollar ?? 0),
    exNairaToYuan: Number(rateRecord?.exNairaToYuan ?? 0),
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Exchange Rates
        </h1>
        <p className="text-sm text-muted-foreground">
          Update global currency conversion values for store pricing and shipping calculations.
        </p>
      </div>

      {/* Page Content */}
      <ExchangeRatesForm rates={rates} />
      
    </div>
  );
}
