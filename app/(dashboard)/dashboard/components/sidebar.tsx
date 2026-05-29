"use client"

import { useAuth } from "@/lib/AuthContext"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronDown,
  LayoutDashboard,
  ShoppingCart,
  Package,
  UserCog,
  FileText,
  LogOut,
  Menu,
  X,
  HandCoins,
  Ship,
  ChartCandlestick,
  Store,
  Wallet,
} from "lucide-react"
import type React from "react"
import { hasServiceAccess, type ServiceKey } from "@/lib/accessControl"

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

interface MenuItem {
  title: string
  icon: React.ElementType
  path: string
  serviceKey?: ServiceKey
  submenu?: { title: string; path: string }[]
}

// --- Menu Configurations ---
const dashboardItem: MenuItem = { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard", serviceKey: "dashboard" }

const features: MenuItem[] = [
  { title: "Procurement", icon: ShoppingCart, path: "/dashboard/procurement?status=pending", serviceKey: "procurement" },
  { title: "Corporate Gifts", icon: Package, path: "/dashboard/corporate-gifts", serviceKey: "corporate_gifts" },
  { title: "Pay Small Small", icon: HandCoins, path: "/dashboard/pay-small-small?status=SAVED", serviceKey: "pay_small_small" },
]

const store: MenuItem[] = [
  {
    title: "Store Mgt.",
    icon: Store,
    path: "/store",
    serviceKey: "store_mgt",
    submenu: [
      { title: "View Products", path: "/dashboard/store/view" },
      { title: "Add Products", path: "/dashboard/store/add" },
      { title: "Store Orders", path: "/dashboard/store-sales" },
    ],
  },
]

const customerAccounts: MenuItem[] = [
  {
    title: "Customer Accounts",
    icon: Wallet,
    path: "/customer-accounts",
    serviceKey: "customer_accounts",
    submenu: [
      { title: "Customers", path: "/dashboard/customer-accounts/customers" },
      { title: "Transactions", path: "/dashboard/customer-accounts/transactions" },
    ],
  },
]

const customerPayouts: MenuItem[] = [
  {
    title: "Payout Requests",
    icon: Wallet,
    path: "/payout-requests",
    serviceKey: "payout_requests",
    submenu: [
      { title: "Payout Requests", path: "/dashboard/payout-requests/requests" },
      { title: "Payout History", path: "/dashboard/payout-requests/transactions" },
    ],
  },
]

const financials: MenuItem[] = [
  { title: "Payments", icon: Wallet, path: "/dashboard/financials", serviceKey: "dashboard" },
  { title: "Invoicing", icon: Wallet, path: "/dashboard/invoicing", serviceKey: "invoicing" },
]

const systemSettings: MenuItem[] = [
  { title: "Profile", icon: UserCog, path: "/dashboard/profile" },
  { title: "Settings", icon: UserCog, path: "/dashboard/settings" },
  {
    title: "Admin Mgt.",
    icon: UserCog,
    path: "/admin",
    serviceKey: "admin_mgt",
    submenu: [
      { title: "Manage Admins", path: "/dashboard/admin/view" },
      { title: "Add Admin", path: "/dashboard/admin/add" },
    ],
  },
  {
    title: "Shipping Plans",
    icon: Ship,
    path: "/shipping-plans",
    serviceKey: "shipping_plans",
    submenu: [
      { title: "Shipping Plans", path: "/dashboard/shipping-plans/add" },
    ],
  },
  {
    title: "Exchanges & Rates",
    icon: ChartCandlestick,
    path: "/exchange-rates",
    serviceKey: "exchange_rates",
    submenu: [
      { title: "Exchange Rates", path: "/dashboard/exchange-rates" },
      { title: "Service Charge & VAT", path: "/dashboard/service-charges" },
    ],
  },
  {
    title: "Blog Management",
    icon: FileText,
    path: "/blog",
    serviceKey: "blog_management",
    submenu: [
      { title: "View All Posts", path: "/dashboard/blog/view" },
      { title: "Create New Post", path: "/dashboard/blog/create" },
    ],
  },
]

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const serviceKeys = user?.serviceKeys || []
  const canAccess = (serviceKey?: ServiceKey) => {
    if (!serviceKey) return true
    return hasServiceAccess(serviceKey, user?.userStatus, serviceKeys)
  }
  const visibleFeatures = features.filter((item) => canAccess(item.serviceKey))
  const visibleCustomerAccounts = customerAccounts.filter((item) => canAccess(item.serviceKey))
  const visibleCustomerPayouts = customerPayouts.filter((item) => canAccess(item.serviceKey))
  const visibleFinancials = financials.filter((item) => canAccess(item.serviceKey))
  const visibleStore = store.filter((item) => canAccess(item.serviceKey))
  const visibleSystemSettings = systemSettings.filter((item) => canAccess(item.serviceKey))

  // Handle responsive behavior
  useEffect(() => {
    const checkWidth = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      if (width < 768) {
        setIsOpen(false)
      } else {
        setIsOpen(true)
      }
    }

    checkWidth()
    window.addEventListener("resize", checkWidth)
    return () => window.removeEventListener("resize", checkWidth)
  }, [setIsOpen])

  const toggleSubmenu = (title: string) => {
    if (!isCollapsed) {
      setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }))
    }
  }

  const handleItemClick = (path: string) => {
    router.push(path)
    if (isMobile) setIsOpen(false) // Auto-close on mobile after navigation
  }

  // Individual Menu Item Component
  const MenuItemComponent = ({ item }: { item: MenuItem }) => {
    const isActive = pathname === item.path || item.submenu?.some(sub => pathname === sub.path)
    const isSubmenuOpen = openMenus[item.title] ?? isActive
    const hasSubmenu = item.submenu && item.submenu.length > 0

    return (
      <div className="relative group">
        <button
          onClick={() => (hasSubmenu ? toggleSubmenu(item.title) : handleItemClick(item.path))}
          className={`flex w-full items-center px-3 py-2.5 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset
            ${isActive 
              ? "bg-primary/10 text-primary font-medium" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
        >
          <item.icon className={`h-4 w-4 min-w-[1rem] ${isActive ? "text-primary" : ""}`} />
          <span
            className={`flex-1 ml-3 text-left whitespace-nowrap overflow-hidden transition-all duration-300 
              ${isCollapsed ? "w-0 ml-0 opacity-0" : "w-auto opacity-100"}`}
          >
            {item.title}
          </span>
          {hasSubmenu && !isCollapsed && (
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isSubmenuOpen ? "rotate-180" : ""}`} />
          )}
        </button>

        {/* Submenu Logic */}
        {hasSubmenu && (
          <div
            className={`
            ${isCollapsed
                ? "invisible group-hover:visible absolute left-full top-0 ml-2 w-48 bg-popover rounded-md shadow-soft border border-border z-50"
                : "relative ml-5 border-l border-border mt-1"
            }
            ${!isCollapsed && !isSubmenuOpen ? "hidden" : ""}
          `}
          >
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${isSubmenuOpen || isCollapsed ? "max-h-96" : "max-h-0"}`}
            >
              <div className={isCollapsed ? "p-1" : "py-1"}>
                {item.submenu?.map((subitem) => {
                  const isSubActive = pathname === subitem.path;
                  return (
                    <a
                      key={`${item.title}-${subitem.path}`}
                      href={subitem.path}
                      onClick={(e) => {
                        e.preventDefault()
                        handleItemClick(subitem.path)
                      }}
                      className={`block px-3 py-2 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset
                        ${isCollapsed ? "" : "ml-2"}
                        ${isSubActive 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      {subitem.title}
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Reusable Category Header
  const CategoryHeader = ({ title }: { title: string }) => (
    <h2 className={`px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-6 overflow-hidden whitespace-nowrap transition-all duration-300 
      ${isCollapsed ? "opacity-0 h-0 mt-0" : "opacity-100"}`}>
      {title}
    </h2>
  )

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-3 left-4 z-50 p-2 text-foreground rounded-md bg-card border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Modern Glassmorphism Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          ${isOpen ? (isCollapsed ? "w-16" : "w-64") : "w-0"}
          ${isMobile ? "fixed left-0 z-40 shadow-soft" : "relative"}
          flex flex-col border-r border-border bg-card transition-all duration-300 overflow-hidden h-screen
        `}
      >
        
        {/* Header / Logo Area */}
        <div className={`p-4 border-b border-border flex items-center h-16 ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <div className={`flex items-center space-x-3 overflow-hidden ${isCollapsed ? "w-0" : "w-auto"}`}>
            <img src="/assets/images/logo2.png" alt="Sure Imports Logo" className="h-8 w-8 min-w-[2rem]" />
            <span className="font-bold text-foreground whitespace-nowrap tracking-tight text-lg">Sure Imports</span>
          </div>
          {!isMobile && (
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className="p-1.5 text-muted-foreground rounded-md hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* User Greeting Panel */}
        <div className={`border-b border-border bg-muted/20 transition-all duration-300 overflow-hidden
          ${isCollapsed ? "h-0 opacity-0" : "p-4 opacity-100"}`}
        >
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Welcome back,</p>
          <p className="text-sm font-bold text-foreground truncate">
            {user?.userFirstname || user?.userEmail || "Admin"}
          </p>
        </div>

        {/* Navigation Area */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          <div className="space-y-0.5">
            {canAccess(dashboardItem.serviceKey) && <MenuItemComponent item={dashboardItem} />}
          </div>
          
          {visibleFeatures.length > 0 && (
            <>
              <CategoryHeader title="Services" />
              <div className="space-y-0.5">
                {visibleFeatures.map((item) => <MenuItemComponent key={item.path} item={item} />)}
              </div>
            </>
          )}

          {(visibleCustomerAccounts.length > 0 || visibleCustomerPayouts.length > 0) && (
            <>
              <CategoryHeader title="Customer Accounts" />
              <div className="space-y-0.5">
                {visibleCustomerAccounts.map((item) => <MenuItemComponent key={item.path} item={item} />)}
                {visibleCustomerPayouts.map((item) => <MenuItemComponent key={item.path} item={item} />)}
              </div>
            </>
          )}

          {visibleFinancials.length > 0 && (
            <>
              <CategoryHeader title="Financials" />
              <div className="space-y-0.5">
                {visibleFinancials.map((item) => <MenuItemComponent key={item.path} item={item} />)}
              </div>
            </>
          )}

          {visibleStore.length > 0 && (
            <>
              <CategoryHeader title="Store" />
              <div className="space-y-0.5">
                {visibleStore.map((item) => <MenuItemComponent key={item.path} item={item} />)}
              </div>
            </>
          )}

          {visibleSystemSettings.length > 0 && (
            <>
              <CategoryHeader title="System & Settings" />
              <div className="space-y-0.5">
                {visibleSystemSettings.map((item) => <MenuItemComponent key={item.path} item={item} />)}
              </div>
            </>
          )}

        </nav>

        {/* Footer Actions */}
        <div className="border-t border-border p-4 bg-muted/10">
          <button
            onClick={logout}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-destructive rounded-md hover:bg-destructive/10 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-inset"
          >
            <LogOut className="h-4 w-4 min-w-[1rem]" />
            <span className={`ml-3 whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
              Logout
            </span>
          </button>
          
          <div className={`mt-3 text-xs text-center font-medium text-muted-foreground whitespace-nowrap transition-all duration-300 ${isCollapsed ? "opacity-0 h-0" : "opacity-100"}`}>
            © {new Date().getFullYear()} Sure Imports
          </div>
        </div>

      </aside>
    </>
  )
}
