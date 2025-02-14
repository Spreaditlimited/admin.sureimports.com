"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
  pidUser: string
  userEmail: string
  userFirstname?: string
}

interface AuthContextType {
  user: User | null
  login: (userEmail: string, userPassword: string) => Promise<void>
  logout: () => Promise<void>
  register: (userEmail: string, userPassword: string, userFirstname?: string) => Promise<void>
  checkAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      if (!res.ok) {
        setUser(null)
        return false
      }
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        return true
      } else {
        setUser(null)
        return false
      }
    } catch (error) {
      console.error("Error checking auth:", error)
      setUser(null)
      return false
    }
  }

  useEffect(() => {
    checkAuth()
  }, []) //This was the line that needed to be updated to include the dependency

  const login = async (userEmail: string, userPassword: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail, userPassword }),
    })
    const data = await res.json()
    if (res.ok) {
      setUser(data.user)
      router.push("/dashboard")
    } else {
      throw new Error(data.message)
    }
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    router.push("/auth/login")
  }

  const register = async (userEmail: string, userPassword: string, userFirstname?: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail, userPassword, userFirstname }),
    })
    const data = await res.json()
    if (res.ok) {
      setUser(data.user)
      router.push("/dashboard")
    } else {
      throw new Error(data.message)
    }
  }

  return <AuthContext.Provider value={{ user, login, logout, register, checkAuth }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

