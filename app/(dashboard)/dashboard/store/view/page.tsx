import ProductsTable from "./components/ProductsTable";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Store Catalog
        </h1>
        <p className="text-sm text-muted-foreground">
          View and manage your product inventory, pricing models, and storefront visibility.
        </p>
      </div>

      {/* Page Content */}
      <ProductsTable />
      
    </div>
  );
}