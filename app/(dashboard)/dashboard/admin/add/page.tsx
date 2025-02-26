import { DashboardLayout } from "../../../dashboard/components/dashboard-layout"
import AdminForm from "./components/AdminForm"


export default function DashboardPage() {
  return (
      <DashboardLayout>
          <h1 className="text-2xl font-bold mb-6">Add Users</h1>
          <AdminForm />
      </DashboardLayout>
  )
}

