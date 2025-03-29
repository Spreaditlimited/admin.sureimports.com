import { DashboardLayout } from "../../../dashboard/components/dashboard-layout"
import ProductDetails from "./components/ProductDetails"


export default function DashboardPage() {
  return (
      <DashboardLayout>
          <h1 className="text-2xl font-bold mb-6">Products Details</h1>
          <ProductDetails />
      </DashboardLayout>
  )
}

