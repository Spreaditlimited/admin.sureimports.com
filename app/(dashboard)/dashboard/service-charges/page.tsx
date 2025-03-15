import { DashboardLayout } from "../components/dashboard-layout"
import ServiceChargeForm from "./components/ServiceChargeForm"
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
      <DashboardLayout>
          <h1 className="text-2xl font-bold mb-6">Service Charge Update</h1>
          <ServiceChargeForm rates={rates} />
      </DashboardLayout>
  )
}

