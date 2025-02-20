import { DashboardLayout } from "../../../dashboard/components/dashboard-layout"
import { BuyPhonesLaptopsContent } from "./components/PageContent"

export default function DashboardPage() {
  return (
      <DashboardLayout>
          <h1 className="text-2xl font-bold mb-6">Add Devices</h1>
          <BuyPhonesLaptopsContent />
      </DashboardLayout>
  )
}

