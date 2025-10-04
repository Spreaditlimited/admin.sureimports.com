"use client"
import { useAuth } from "@/lib/AuthContext"
import { useState, useEffect, type ReactNode, Suspense } from "react"
import { Sidebar } from "./sidebar"
import { Search, Sun, Moon, ChevronDown } from "lucide-react"
import Loading from "@/components/layouts/loading"
import { AuthProvider } from "@/app/context/AuthContext"
import { TokenValidator } from "@/lib/TokenValidator"

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
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
    <div className="flex h-screen">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center w-full max-w-md">
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
              <a href="#" className="block px-4 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                  Profile<br />
                  <small>{user?.userEmail}</small>
                </a>
                <a href="#" className="block px-4 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                  Settings
                </a>
                <button type="button" className="w-full text-left block px-4 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700" onClick={logout}>
                  Logout
                </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <AuthProvider>
          <TokenValidator>
              {children}
          </TokenValidator>
          </AuthProvider>
        </main>
      </div>
      

    </div>
  )
}

