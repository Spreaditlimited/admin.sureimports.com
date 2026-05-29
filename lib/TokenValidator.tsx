"use client"

import { useAuth } from "@/lib/AuthContext"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import type React from "react"
import {
  getFirstAllowedDashboardRoute,
  getRequiredServiceForPath,
  hasServiceAccess,
} from "@/lib/accessControl"

export function TokenValidator({ children }: { children: React.ReactNode }) {
  const { checkAuth, user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const validateToken = async () => {
      const isAuthenticated = await checkAuth()
      if (!isAuthenticated) {
        router.push("/auth/login")
      }
    }

    void validateToken()
  }, [checkAuth, router])

  useEffect(() => {
    if (loading || !user) return
    if (!pathname.startsWith("/dashboard")) return

    const requiredService = getRequiredServiceForPath(pathname)
    if (!requiredService) return

    const allowed = hasServiceAccess(requiredService, user.userStatus, user.serviceKeys || [])
    if (!allowed) {
      const fallback = getFirstAllowedDashboardRoute(user.userStatus, user.serviceKeys || [])
      router.push(fallback || "/auth/login")
    }
  }, [loading, pathname, router, user])

  return <>{children}</>
}
