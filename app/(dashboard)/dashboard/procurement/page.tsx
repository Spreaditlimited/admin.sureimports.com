import { DashboardLayout } from "../../dashboard/components/dashboard-layout"
import { ProcurementContent } from "./components/PageContent"

export default function DashboardPage() {
  return (
      <div className="space-y-6">
          
          {/* Page Header */}
          <div className="flex flex-col gap-1 px-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Procurement
              </h1>
              <p className="text-sm text-muted-foreground">
                  Manage, track, and process customer procurement orders.
              </p>
          </div>

          {/* Page Content */}
          <ProcurementContent />
          
      </div>
  )
}