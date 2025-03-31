import { DashboardLayout } from "../../dashboard/components/dashboard-layout"
import { BuyPhonesLaptopsContent } from "./components/PageContent"

export default function DashboardPage() {
  return (
      <>
          <h1 className="text-2xl font-bold mb-6">Phones & Laptops</h1>
          <BuyPhonesLaptopsContent />
      </>
  )
}

