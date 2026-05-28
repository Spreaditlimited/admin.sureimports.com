import AdminForm from "./components/AdminForm"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create Admin User
        </h1>
        <p className="text-sm text-muted-foreground">
          Provision a new administrative account and define their system access privileges.
        </p>
      </div>

      {/* Page Content */}
      <AdminForm />
      
    </div>
  )
}