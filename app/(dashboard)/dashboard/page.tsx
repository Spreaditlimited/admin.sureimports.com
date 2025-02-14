import { DashboardLayout } from "./components/dashboard-layout"
import { DashboardContent } from "./components/dashboard-content"

export default function DashboardPage() {
  return (
    <DashboardLayout>
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          <DashboardContent />
    </DashboardLayout>
  )
}

