import CustomersTable from "./components/CustomersTable"

export default function CustomersPage() {
  return (
    <div className="space-y-6">
        
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Customers
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage and view all registered and active customers.
        </p>
      </div>

      {/* Page Content */}
      <CustomersTable />
      
    </div>
  )
}