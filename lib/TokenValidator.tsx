"use client"

import { useAuth } from "@/lib/AuthContext"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import type React from "react"

// Define protected routes
const protectedRoutes = ["/dashboard", "/profile", "/settings"]

export function TokenValidator({ children }: { children: React.ReactNode }) {
  const { checkAuth } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const validateToken = async () => {
      const isAuthenticated = await checkAuth()
      const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

      if (!isAuthenticated && isProtectedRoute) {
        router.push("/auth/login")
      }
    }

    validateToken()
  }, [])

  return <>{children}</>
}

