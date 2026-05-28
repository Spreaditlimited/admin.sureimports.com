import { Suspense } from "react"
import CustomerTransactionsTable from "./components/CustomerTransactionsTable"
import Loading from "@/components/layouts/loading"

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Customer Transactions
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor and audit all financial movements across customer accounts.
        </p>
      </div>

      {/* Page Content */}
      <Suspense fallback={<Loading />}>
        <CustomerTransactionsTable />
      </Suspense>

    </div>
  )
}