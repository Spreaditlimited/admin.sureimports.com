//import { DashboardLayout } from "../../../dashboard/components/dashboard-layout"
import CustomerAccountsTable from "./components/CustomerAccountsTable"


export default function DashboardPage() {
  return (
    <>
      {/* // <DashboardLayout> */}
          <h1 className="text-2xl font-bold mb-6">Customer Accounts</h1>
          <CustomerAccountsTable />
      {/* // </DashboardLayout> */}
      </>
  )
}

