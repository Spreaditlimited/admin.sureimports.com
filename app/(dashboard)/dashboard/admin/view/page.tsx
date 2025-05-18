import { DashboardLayout } from "../../../dashboard/components/dashboard-layout"
import AdminTable from "./components/AdminTable"


export default function DashboardPage() {
  return (
    <>
      {/* // <DashboardLayout> */}
          <h1 className="text-2xl font-bold mb-6">Admin Users</h1>
          <AdminTable />
      {/* // </DashboardLayout> */}
      </>
  )
}

