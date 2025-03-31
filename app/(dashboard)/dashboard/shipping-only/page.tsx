import { DashboardLayout } from "../../dashboard/components/dashboard-layout"
import ShippingOnly from "./components/ShippingOnly"

export default function DashboardPage() {
  return (
      <>
          <h1 className="text-2xl font-bold mb-6">Shipping Only</h1>
          <ShippingOnly />
      </>
  )
}

