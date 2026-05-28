import AddProduct from "./components/AddProduct"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Add New Product
        </h1>
        <p className="text-sm text-muted-foreground">
          Expand your inventory by registering a new product in the Sure Imports catalog.
        </p>
      </div>

      {/* Page Content */}
      <AddProduct />
      
    </div>
  )
}