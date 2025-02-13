import { DashboardLayout } from "../../dashboard/components/dashboard-layout"
import { ProcurementContent } from "./components/PageContent"

export default function DashboardPage() {
  return (
      <DashboardLayout>
          <h1 className="text-2xl font-bold mb-6">Procurement</h1>
          <ProcurementContent />
      </DashboardLayout>
  )
}

