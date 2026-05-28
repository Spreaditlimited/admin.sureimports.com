import PaySmallSmall from "./components/PaySmallSmall"

export default function DashboardPage() {
  return (
      <div className="space-y-6">
          
          {/* Page Header */}
          <div className="flex flex-col gap-1 px-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Pay Small Small
              </h1>
              <p className="text-sm text-muted-foreground">
                  Manage and track customer installment payments and layaway plans.
              </p>
          </div>

          {/* Page Content */}
          <PaySmallSmall />
          
      </div>
  )
}