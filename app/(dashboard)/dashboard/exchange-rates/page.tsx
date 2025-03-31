import { DashboardLayout } from "../../dashboard/components/dashboard-layout"
import ExchangeRatesForm from "./components/ExchageRatesForm"
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function DashboardPage() {

  // const params = await props.params;
  // const productID = params.pidProduct;

  //const products = await prisma.products.findMany()
  //const rates: any = await prisma.exchange_rate.findFirst();
  const rates: any = await prisma.exchange_rate.findUnique({
    where: {
      id: 1,
    },
  });
console.log(JSON.stringify(rates));

  return (
      <>
          <h1 className="text-2xl font-bold mb-6">Exchange Rates Update</h1>
          <ExchangeRatesForm rates={rates} />
      </>
  )
}

