"use client"
import { useAuth } from "@/lib/AuthContext"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronDown,
  LayoutDashboard,
  ShoppingCart,
  Folder,
  Package,
  HelpCircle,
  Users,
  MessageSquare,
  CreditCard,
  Settings,
  UserCog,
  User,
  FileText,
  MessageCircle,
  Ticket,
  LogOut,
  Menu,
  X,
  ShoppingBag,
  HandCoins,
  UserCheck,
  Ship,
  MonitorSmartphone,
} from "lucide-react"
import type React from "react"

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

interface MenuItem {
  title: string
  icon: React.ElementType
  path: string
  submenu?: { title: string; path: string }[]
}

const features: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    title: "Procurement",
    icon: ShoppingCart,
    path: "/dashboard/procurement?status=saved",
  },
  {
    title: "Buy Phones & Laptops",
    icon: MonitorSmartphone,
    path: "/dashboard/buy-phones-laptops",
  },
  // {
  //   title: "Special Sourcing",
  //   icon: ShoppingBag,
  //   path: "/dashboard/special-sourcing?status=pending",
  // },
  // {
  //   title: "Pay Supplier",
  //   icon: HandCoins,
  //   path: "/dashboard/pay-supplier",
  // },
  // {
  //   title: "Shipping Only",
  //   icon: Ship,
  //   path: "/dashboard/shipping-only?status=request-received",
  // },
  // {
  //   title: "Verify Supplier",
  //   icon: UserCheck,
  //   path: "/dashboard/verify-supplier?status=pending-payment",
  // },
  // {
  //   title: "Dashboard",
  //   icon: LayoutDashboard,
  //   path: "/",
  // },
  // {
  //   title: "Orders",
  //   icon: ShoppingCart,
  //   path: "/orders",
  //   submenu: [
  //     { title: "All Orders", path: "/orders" },
  //     { title: "Pending", path: "/orders/pending" },
  //     { title: "Completed", path: "/orders/completed" },
  //   ],
  // },
  // {
  //   title: "Category",
  //   icon: Folder,
  //   path: "/category",
  //   submenu: [
  //     { title: "All Categories", path: "/category" },
  //     { title: "Add Category", path: "/category/add" },
  //   ],
  // },
  // {
  //   title: "Products",
  //   icon: Package,
  //   path: "/products",
  //   submenu: [
  //     { title: "All Products", path: "/products" },
  //     { title: "Add Product", path: "/products/add" },
  //     { title: "Categories", path: "/products/categories" },
  //   ],
  // },
  // { title: "FAQs", icon: HelpCircle, path: "/faqs" },
  // { title: "Subscribers", icon: Users, path: "/subscribers" },
  // { title: "Messages", icon: MessageSquare, path: "/messages" },
  // { title: "Payments", icon: CreditCard, path: "/payments" },
]

const systemSettings: MenuItem[] = [
  // {
  //   title: "Admin Mgt.",
  //   icon: UserCog,
  //   path: "/admin",
  //   submenu: [
  //     { title: "All Admins", path: "/admin" },
  //     { title: "Add Admin", path: "/admin/add" },
  //     { title: "Roles", path: "/admin/roles" },
  //   ],
  // },
  // {
  //   title: "User Mgt.",
  //   icon: User,
  //   path: "/users",
  //   submenu: [
  //     { title: "All Users", path: "/users" },
  //     { title: "Add User", path: "/users/add" },
  //     { title: "User Roles", path: "/users/roles" },
  //   ],
  // },
  // { title: "Blog", icon: FileText, path: "/blog" },
  // {
  //   title: "Settings & Config.",
  //   icon: Settings,
  //   path: "/settings",
  //   submenu: [
  //     { title: "General", path: "/settings" },
  //     { title: "Security", path: "/settings/security" },
  //     { title: "Appearance", path: "/settings/appearance" },
  //   ],
  // },
  // { title: "Messages", icon: MessageCircle, path: "/system-messages" },
  // { title: "Coupon Mgt.", icon: Ticket, path: "/coupons" },
  // { title: "Payments & Refunds", icon: CreditCard, path: "/payment-settings" },
]

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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
  }

  const MenuItem = ({ item }: { item: MenuItem }) => {
    const isActive = pathname === item.path
    const isSubmenuOpen = openMenus[item.title]
    const hasSubmenu = item.submenu && item.submenu.length > 0

    return (
      <div className="relative group">
        <button
          onClick={() => (hasSubmenu ? toggleSubmenu(item.title) : handleItemClick(item.path))}
          className={`flex w-full items-center px-3 py-2 text-sm rounded-lg transition-colors ${
            isActive ? "bg-primary/10 text-primary" : "hover:bg-secondary"
          }`}
        >
          <item.icon className="h-4 w-4 min-w-[1rem]" />
          <span
            className={`flex-1 ml-3 text-left whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isCollapsed ? "w-0 ml-0" : "w-auto"
            }`}
          >
            {item.title}
          </span>
          {hasSubmenu && !isCollapsed && (
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isSubmenuOpen ? "rotate-180" : ""}`} />
          )}
        </button>

        {hasSubmenu && (
          <div
            className={`
            ${
              isCollapsed
                ? "invisible group-hover:visible absolute left-full top-0 ml-2 w-48 bg-card rounded-lg shadow-lg border"
                : "relative ml-6"
            }
            ${!isCollapsed && !isSubmenuOpen ? "hidden" : ""}
          `}
          >
            <div
              className={`
              overflow-hidden transition-all duration-300 ease-in-out
              ${isSubmenuOpen || isCollapsed ? "max-h-96" : "max-h-0"}
            `}
            >
              {item.submenu?.map((subitem) => (
                <a
                  key={subitem.path}
                  href={subitem.path}
                  onClick={(e) => {
                    e.preventDefault()
                    handleItemClick(subitem.path)
                  }}
                  className={`
                    block px-3 py-2 text-sm rounded-lg hover:bg-secondary
                    ${isCollapsed ? "m-1" : "mt-1"}
                    ${pathname === subitem.path ? "bg-primary/10 text-primary" : ""}
                  `}
                >
                  {subitem.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-background border`}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isMobile && isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />}

      <aside
        className={`
        ${isOpen ? (isCollapsed ? "w-16" : "w-64") : "w-0"}
        ${isMobile ? "fixed left-0 z-40" : "relative"}
        flex flex-col border-r bg-card transition-all duration-300 overflow-hidden h-screen
      `}
      >
        
        <div className={`p-4 border-b flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <div className={`flex items-center space-x-2 overflow-hidden ${isCollapsed ? "w-0" : "w-auto"}`}>
            <img
              src="/assets/images/logo2.png"
              alt="Logo"
              className="h-8 w-8 min-w-[2rem]"
            />
            <span className="font-semibold whitespace-nowrap">SureImports</span>
          </div>
          {!isMobile && (
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 rounded-lg hover:bg-secondary">
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>


        <div
          className={`mt-2 text-sm text-orange-500 text-muted-foreground px-4 overflow-hidden whitespace-nowrap transition-all duration-300 ${
            isCollapsed ? "opacity-0" : "opacity-100"
          }`}
        >
          <i>{user?.userFirstname && 'Hi'} {user?.userFirstname || user?.userEmail}</i>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-6 custom-scrollbar">
          <div>
            <h2
              className={`px-3 text-xs font-semibold text-muted-foreground mb-2 overflow-hidden whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0" : "opacity-100"
              }`}
            >
              FEATURES
            </h2>
            <div className="space-y-1">
              {features.map((item) => (
                <MenuItem key={item.path} item={item} />
              ))}
            </div>
          </div>

          <div>
            <h2
              className={`px-3 text-xs font-semibold text-muted-foreground mb-2 overflow-hidden whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? "opacity-0" : "opacity-100"
              }`}
            >
              SYSTEM & SETTINGS
            </h2>
            <div className="space-y-1">
              {systemSettings.map((item) => (
                <MenuItem key={item.path} item={item} />
              ))}
            </div>
          </div>
        </nav>

        <div className="border-t p-4">
          <button
            onClick={logout}
            className="flex w-full items-center px-3 py-2 text-sm rounded-lg hover:bg-secondary"
          >
            <LogOut className="h-4 w-4 min-w-[1rem]" />
            <span
              className={`ml-3 transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}
            >
              Logout
            </span>
          </button>
          <div
            className={`mt-4 text-xs text-center text-muted-foreground transition-all duration-300 ${
              isCollapsed ? "opacity-0" : "opacity-100"
            }`}
          >
            © 2025. All rights reserved.
          </div>
        </div>
      </aside>
    </>
  )
}

