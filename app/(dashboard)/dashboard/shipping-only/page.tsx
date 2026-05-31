import ShippingOnly from "./components/ShippingOnly";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Freight Provisioning
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage standalone shipping requests, freight forwarding documentation, and logistics tracking.
        </p>
      </div>

      {/* Main Logistics Workspace */}
      <div className="pt-2">
        <ShippingOnly />
      </div>
      
    </div>
  );
}