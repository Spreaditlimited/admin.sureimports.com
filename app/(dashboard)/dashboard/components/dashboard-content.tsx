"use client"

import { useAuth } from "@/lib/AuthContext"
import { useEffect, useState } from "react"

interface StatCardProps {
  title: string
  value: number | string
  subtitle: string
  className?: string
  isLoading?: boolean
}

function StatCard({ title, value, subtitle, className = "", isLoading = false }: StatCardProps) {
  return (
    <div className={`bg-card border border-border shadow-soft p-6 rounded-lg flex flex-col justify-between ${className}`}>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      
      {isLoading ? (
        <div className="h-9 bg-muted animate-pulse rounded mt-3 w-1/2"></div>
      ) : (
        <p className="text-3xl font-bold text-foreground mt-2">
          {typeof value === 'number' ? value.toLocaleString("en-US") : value}
        </p>
      )}
      
      <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
    </div>
  )
}

interface DashboardStats {
  totalCustomers: number
  activeCustomers: number
  totalOrders: number
  activeOrders: number
  totalProducts: number
  storeProducts: number
  totalServices: number
  totalPayments: number
  pendingPaySupplier: number
  totalAffiliates: number
  totalMessages: number
  unreadMessages: number
  totalStoreProducts: number
  totalPaySmallSmall: number
  completedPaySmallSmall: number
  totalRevenue: number
  recentOrders: number
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { user } = useAuth()

  // Cleanly abstract the admin check to prevent logic rendering bugs
  const isAdmin = user?.userEmail === 'nkwochatochukwu@gmail.com' || user?.userEmail === 'atsuemmanuel@gmail.com';

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-border pb-6">
          <StatCard
            title="Total Revenue"
            value={`₦${(stats?.totalRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Successful Payments"
            isLoading={isLoading}
          />
          <StatCard
            title="Total Payments"
            value={stats?.totalPayments || 0}
            subtitle="All Transactions"
            isLoading={isLoading}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Customers"
          value={stats?.totalCustomers || 0}
          subtitle="All Registered Customers"
          isLoading={isLoading}
        />
        <StatCard
          title="Active Customers"
          value={stats?.activeCustomers || 0}
          subtitle="Currently Active Customers"
          isLoading={isLoading}
        />
        <StatCard
          title="Total Affiliates"
          value={stats?.totalAffiliates || 0}
          subtitle="Registered Affiliates"
          isLoading={isLoading}
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || 0}
          subtitle="All Time Orders"
          isLoading={isLoading}
        />
        <StatCard
          title="Order Products"
          value={stats?.totalProducts || 0}
          subtitle="Products in Orders"
          isLoading={isLoading}
        />
        <StatCard
          title="Store Products"
          value={stats?.storeProducts || 0}
          subtitle="Visible Store Products"
          isLoading={isLoading}
        />
        <StatCard
          title="PaySmallSmall"
          value={stats?.totalPaySmallSmall || 0}
          subtitle={`${stats?.completedPaySmallSmall || 0} Completed`}
          isLoading={isLoading}
        />
        <StatCard
          title="Recent Orders"
          value={stats?.recentOrders || 0}
          subtitle="Last 30 Days"
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
