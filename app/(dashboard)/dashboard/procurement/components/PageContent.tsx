import CounterBoxProcurement from "./CounterBoxProcurement"
import OrdersBoxProcurement from "./OrdersBoxProcurement"

interface StatCardProps {
  title: string
  value: number
  subtitle: string
  className?: string
}

function StatCard({ title, value, subtitle, className = "" }: StatCardProps) {
  return (
    <div className={`bg-card border border-border shadow-soft p-6 rounded-lg flex flex-col justify-between ${className}`}>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-3xl font-bold text-foreground mt-2">
        {value.toLocaleString("en-US")}
      </p>
      <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
    </div>
  )
}

export function ProcurementContent() {
  return (
    // Replaced the fragmented p-3 wrappers with a unified space-y-6 layout
    // to match the exact vertical rhythm of the DashboardContent page.
    <div className="space-y-6">
      
      <div>
        <CounterBoxProcurement />
      </div>

      <div>
        <OrdersBoxProcurement />
      </div>

    </div>
  )
}