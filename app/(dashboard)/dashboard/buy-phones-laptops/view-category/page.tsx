import { PrismaClient } from "@prisma/client";
import { DashboardLayout } from "../../../dashboard/components/dashboard-layout"
import { BuyPhonesLaptopsContent } from "./components/PageContent"
import TableLayout from "./components/TableLayout";




type TableData = {
  id: number;
  categoryName: string;
  categoryInfo: string;
  status: string;
};


export default async function DashboardPage() {

  // const prisma = new PrismaClient();
  // const users:any = await prisma.buy_category.findMany();
  // await prisma.$disconnect();

  // return {
  //   props: {
  //     initialData: users,
  //   },
  // };

    // Sample data for the table
// const initialData: TableData[] = [
//     { id: 1, categoryName: "EmJohn Doe", categoryInfo: "john.doe@example.com", status: "Active" },
//     { id: 2, categoryName: "Emmanuel Atsu", categoryInfo: "john.doe@example.com", status: "Active" },
//   ];


  return (
      <DashboardLayout>
          <h1 className="text-2xl font-bold mb-6">View Devices</h1>
          {/* <TableLayout initialData={users}  /> */}
      </DashboardLayout>
  )
}

