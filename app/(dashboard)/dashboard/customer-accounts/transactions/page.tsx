//import { DashboardLayout } from "../../../dashboard/components/dashboard-layout"
import { Suspense } from "react"
import CustomerTransactionsTable from "./components/CustomerTransactionsTable"
import Loading from "@/components/layouts/loading"
import { PrismaClient } from "@prisma/client";


export default async function DashboardPage() {


  // const prisma = new PrismaClient();
  // const users:any = await prisma.buy_category.findMany();
  // await prisma.$disconnect();


  return (
    <>
      {/* // <DashboardLayout> */}
          <h1 className="text-2xl font-bold mb-6">Customer Transactions</h1>     
          <CustomerTransactionsTable />
      {/* // </DashboardLayout> */}
      </>
  )
}

