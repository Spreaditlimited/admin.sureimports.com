import { DashboardLayout } from "../../dashboard/components/dashboard-layout"
import VerifySupplier from "./components/VerifySupplier"

export default function DashboardPage() {
  return (
      <DashboardLayout>
          <h1 className="text-2xl font-bold mb-6">Verify Supplier</h1>
          <VerifySupplier />
      </DashboardLayout>
  )
}

