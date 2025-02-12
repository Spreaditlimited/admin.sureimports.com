interface StatCardProps {
    title: string
    value: number
    subtitle: string
    className?: string
  }
  
  function StatCard({ title, value, subtitle, className = "" }: StatCardProps) {
    return (
      <div className={`p-6 rounded-lg ${className}`}>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-4xl font-bold mt-2">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
    )
  }
  
  export function DashboardContent() {
    return (
      <>
        
  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Customers"
            value={0}
            subtitle="All Registered Customers"
            className="bg-blue-50 dark:bg-blue-950"
          />
          <StatCard
            title="Active Customers"
            value={0}
            subtitle="Active Customers"
            className="bg-yellow-50 dark:bg-yellow-950"
          />
          <StatCard title="Orders" value={0} subtitle="Active Orders" className="bg-green-50 dark:bg-green-950" />
          <StatCard title="Products" value={0} subtitle="All Products" className="bg-red-50 dark:bg-red-950" />
          <StatCard
            title="Categories"
            value={0}
            subtitle="All Product Categories"
            className="bg-green-50 dark:bg-green-950"
          />
          <StatCard title="Payments" value={0} subtitle="All Transactions" className="bg-red-50 dark:bg-red-950" />
        </div>
      </>
    )
  }
  
  