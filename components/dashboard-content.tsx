"use client"
import { useAuth } from "@/lib/AuthContext"
import { useState, useEffect } from "react"
import { Search, Sun, Moon, ChevronDown } from "lucide-react"

interface DashboardContentProps {
  sidebarOpen: boolean
}

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

export function DashboardContent({ sidebarOpen }: DashboardContentProps) {
    const { user, logout } = useAuth()
  const [isDark, setIsDark] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    setIsDark(savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches))
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem("theme", newTheme ? "dark" : "light")
    if (newTheme) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  return (
    <main className={`flex-1 overflow-y-auto bg-background`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center w-full max-w-md md:ml-0 ml-12">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-md bg-background border"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-secondary">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <img src="/assets/images/default.png" alt="User avatar" className="w-8 h-8 rounded-full" />
              <span className="hidden md:inline-block font-medium">{user?.userFirstname}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg py-1 z-10">
                <a href="#" className="block px-4 py-2 text-sm hover:bg-secondary">
                  Profile<br />
                  <small>{user?.userEmail}</small>
                </a>
                <a href="#" className="block px-4 py-2 text-sm hover:bg-secondary">
                  Settings
                </a>
                <a type="button" className="block px-4 py-2 text-sm hover:bg-secondary" onClick={logout}>
                  Logout
                </a>
              </div>
            )}
          </div>
        </div>
      </div>


      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
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
      </div>


    </main>
  )
}

