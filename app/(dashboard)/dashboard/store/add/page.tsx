import { DashboardLayout } from "../../../dashboard/components/dashboard-layout"
import AddProduct from "./components/AddProduct"


export default function DashboardPage() {
  return (
      <DashboardLayout>
          <h1 className="text-2xl font-bold mb-6">Add Products</h1>
          <AddProduct />
      </DashboardLayout>
  )
}

