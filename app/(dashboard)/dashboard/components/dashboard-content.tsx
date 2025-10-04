"use client"

import { useAuth } from "@/app/context/AuthContext"
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
    <div className={`p-6 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {isLoading ? (
        <div className="h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-2 w-24"></div>
      ) : (
        <p className="text-4xl font-bold mt-2">{typeof value === 'number' ? value.toLocaleString("en-US") : value}</p>
      )}
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
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

  const { user, logout } = useAuth()

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
    <>
    { (user?.userEmail == 'nkwochatochukwu@gmail.com') || (user?.userEmail == 'atsuemmanuel@gmail.com') &&
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 pb-10">
              <StatCard
                title="Total Revenue"
                value={`₦${(stats?.totalRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle="Successful Payments"
                className="bg-emerald-50 dark:bg-emerald-950"
                isLoading={isLoading}
              />
              <StatCard
                title="Total Payments"
                value={stats?.totalPayments || 0}
                subtitle="All Transactions"
                className="bg-orange-50 dark:bg-orange-950"
                isLoading={isLoading}
              />
      </div>
      }

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Customers"
          value={stats?.totalCustomers || 0}
          subtitle="All Registered Customers"
          className="bg-blue-50 dark:bg-blue-950"
          isLoading={isLoading}
        />
        <StatCard
          title="Active Customers"
          value={stats?.activeCustomers || 0}
          subtitle="Currently Active Customers"
          className="bg-green-50 dark:bg-green-950"
          isLoading={isLoading}
        />
        <StatCard
          title="Total Affiliates"
          value={stats?.totalAffiliates || 0}
          subtitle="Registered Affiliates"
          className="bg-violet-50 dark:bg-violet-950"
          isLoading={isLoading}
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || 0}
          subtitle="All Time Orders"
          className="bg-purple-50 dark:bg-purple-950"
          isLoading={isLoading}
        />
        {/* <StatCard
          title="Active Orders"
          value={stats?.activeOrders || 0}
          subtitle="Pending & Processing Orders"
          className="bg-yellow-50 dark:bg-yellow-950"
          isLoading={isLoading}
        /> */}

        <StatCard
          title="Order Products"
          value={stats?.totalProducts || 0}
          subtitle="Products in Orders"
          className="bg-pink-50 dark:bg-pink-950"
          isLoading={isLoading}
        />
        <StatCard
          title="Store Products"
          value={stats?.storeProducts || 0}
          subtitle="Visible Store Products"
          className="bg-indigo-50 dark:bg-indigo-950"
          isLoading={isLoading}
        />
        {/* <StatCard
          title="Total Services"
          value={stats?.totalServices || 0}
          subtitle="All Service Requests"
          className="bg-teal-50 dark:bg-teal-950"
          isLoading={isLoading}
        /> */}


        {/* <StatCard
          title="Pending Pay Supplier"
          value={stats?.pendingPaySupplier || 0}
          subtitle="Awaiting Processing"
          className="bg-red-50 dark:bg-red-950"
          isLoading={isLoading}
        /> */}

        {/* <StatCard
          title="Unread Messages"
          value={stats?.unreadMessages || 0}
          subtitle={`of ${stats?.totalMessages || 0} Total Messages`}
          className="bg-cyan-50 dark:bg-cyan-950"
          isLoading={isLoading}
        /> */}
        <StatCard
          title="PaySmallSmall"
          value={stats?.totalPaySmallSmall || 0}
          subtitle={`${stats?.completedPaySmallSmall || 0} Completed`}
          className="bg-lime-50 dark:bg-lime-950"
          isLoading={isLoading}
        />
        <StatCard
          title="Recent Orders"
          value={stats?.recentOrders || 0}
          subtitle="Last 30 Days"
          className="bg-amber-50 dark:bg-amber-950"
          isLoading={isLoading}
        />
      </div>
    </>
  )
}

