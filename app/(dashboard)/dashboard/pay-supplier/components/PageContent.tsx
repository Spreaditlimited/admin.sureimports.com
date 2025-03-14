import CounterBoxPaySupplier from "../components/CounterBoxPaySupplier"
import OrdersBoxPaySupplier from "../components/OrdersBoxPaySupplier"

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
  

  export function ProcurementContent() {
    return (
      <>

<div className="">
                <div className="p-3">
                    <CounterBoxPaySupplier />
                </div>

                <div className="p-3">
                    <OrdersBoxPaySupplier />
                </div>
            </div>

      </>
    )
  }
  
  