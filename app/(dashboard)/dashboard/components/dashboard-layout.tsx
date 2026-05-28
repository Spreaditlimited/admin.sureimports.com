"use client"
import { useAuth } from "@/lib/AuthContext"
import { useState, useEffect, useRef, type KeyboardEvent, type ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { Search, Sun, Moon, ChevronDown } from "lucide-react"
import { AuthProvider } from "@/app/context/AuthContext"
import { TokenValidator } from "@/lib/TokenValidator"
import { useRouter } from "next/navigation"

interface DashboardLayoutProps {
  children: ReactNode
}

interface GlobalSearchResult {
  entityType: string
  entityId: string
  title: string
  subtitle: string
  route: string
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, checkAuth } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [activeResultIndex, setActiveResultIndex] = useState(-1)
  
  // Ref to detect clicks outside the user menu
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Handle Initial Theme Load
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    setIsDark(savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches))
  }, [])

  // Handle Click Outside for Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
        setActiveResultIndex(-1)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setIsSearchLoading(false)
      return
    }

    const controller = new AbortController()
    setIsSearchLoading(true)

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/global?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          setSearchResults([])
          return
        }

        const data = await response.json()
        setSearchResults(Array.isArray(data?.results) ? data.results : [])
        setActiveResultIndex(-1)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSearchResults([])
        }
      } finally {
        setIsSearchLoading(false)
      }
    }, 250)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [searchQuery])

  const navigateToResult = (result: GlobalSearchResult) => {
    router.push(result.route)
    setIsSearchOpen(false)
    setSearchQuery("")
    setSearchResults([])
    setActiveResultIndex(-1)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveResultIndex((prev) => {
        const nextIndex = prev + 1
        return nextIndex >= searchResults.length ? 0 : nextIndex
      })
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveResultIndex((prev) => {
        if (prev <= 0) return searchResults.length - 1
        return prev - 1
      })
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      const selected = activeResultIndex >= 0 ? searchResults[activeResultIndex] : searchResults[0]
      if (selected) navigateToResult(selected)
      return
    }

    if (event.key === "Escape") {
      setIsSearchOpen(false)
      setActiveResultIndex(-1)
    }
  }

  useEffect(() => {
    const onAuthRefresh = () => {
      void checkAuth()
    }
    window.addEventListener("auth-refresh", onAuthRefresh)
    return () => window.removeEventListener("auth-refresh", onAuthRefresh)
  }, [checkAuth])

  const cloudinaryBase = process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL?.trim() || ""
  const avatarSrc = user?.userImage
    ? (/^https?:\/\//i.test(user.userImage) ? user.userImage : `${cloudinaryBase}/${user.userImage}`)
    : "/assets/images/default.png"

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
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Area */}
        <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm z-10">
          
          {/* Search Bar */}
          <div className="flex items-center w-full pl-12 md:pl-0 max-w-[230px] sm:max-w-sm md:max-w-md" ref={searchRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsSearchOpen(true)
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search orders, customers, invoices..."
                aria-label="Global dashboard search"
                className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-input bg-background placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              />

              {isSearchOpen && (
                <div className="absolute top-[calc(100%+0.5rem)] left-0 w-[min(92vw,36rem)] rounded-lg border border-border bg-popover shadow-soft z-50 overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    {isSearchLoading && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                    )}

                    {!isSearchLoading && searchQuery.trim().length < 2 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Type at least 2 characters</div>
                    )}

                    {!isSearchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No matches found</div>
                    )}

                    {!isSearchLoading && searchResults.map((result, index) => (
                      <button
                        key={`${result.entityType}-${result.entityId}-${index}`}
                        type="button"
                        onClick={() => navigateToResult(result)}
                        className={`w-full text-left px-3 py-2 border-b border-border/60 last:border-b-0 transition-colors ${
                          index === activeResultIndex ? "bg-muted" : "hover:bg-muted/70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {result.entityType}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{result.subtitle}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            {/* User Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-1 pl-2 pr-3 rounded-full hover:bg-muted border border-transparent focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              >
                <img src={avatarSrc} alt="User avatar" className="w-8 h-8 rounded-full border border-border object-cover" />
                <span className="hidden md:inline-block text-sm font-medium">
                  {user?.userFirstname || "Admin"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Dropdown Content */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-soft py-1 z-50 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
                  
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user?.userFirstname} {user?.userLastname}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {user?.userEmail}
                    </p>
                  </div>
                  
                  {/* Links */}
                  <div className="py-1">
                    <a href="/dashboard/profile" className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                      Profile
                    </a>
                    <a href="/dashboard/settings" className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                      Settings
                    </a>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-border py-1">
                    <button 
                      type="button" 
                      onClick={logout}
                      className="w-full text-left block px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Logout
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Canvas Area */}
        <main className="admin-theme-surface flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 custom-scrollbar">
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
