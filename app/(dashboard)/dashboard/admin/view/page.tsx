import AdminTable from "./components/AdminTable";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Administrative Users
        </h1>
        <p className="text-sm text-muted-foreground">
          Audit and manage system-level access, roles, and administrative permissions.
        </p>
      </div>

      {/* Page Content */}
      <AdminTable />
      
    </div>
  );
}