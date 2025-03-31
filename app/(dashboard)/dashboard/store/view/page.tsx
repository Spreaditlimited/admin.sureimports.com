import { DashboardLayout } from "../../../dashboard/components/dashboard-layout"
import ProductsTable from "./components/ProductsTable"


export default function DashboardPage() {
  return (
      <>
          <h1 className="text-2xl font-bold mb-6">Products </h1>
          <ProductsTable />
      </>
  )
}

