import { DashboardLayout } from "../../dashboard/components/dashboard-layout"
import SpecialSourcing from "./components/SpecialSourcing"

export default function DashboardPage() {
  return (
      <DashboardLayout>
          <h1 className="text-2xl font-bold mb-6">Special Sourcing</h1>
          <SpecialSourcing />
      </DashboardLayout>
  )
}

