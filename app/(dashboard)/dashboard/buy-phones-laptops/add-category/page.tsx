import { DashboardLayout } from "../../../dashboard/components/dashboard-layout"
import CategoryForm from "./components/CategoryForm"

export default function DashboardPage() {
  return (
      <DashboardLayout>
          <h1 className="text-2xl font-bold mb-6">Add Category</h1>
          <CategoryForm />
      </DashboardLayout>
  )
}

