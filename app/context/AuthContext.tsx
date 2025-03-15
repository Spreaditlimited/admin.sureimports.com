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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if the user is already logged in
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user)
        }
      })
      .catch((error) => console.error("Error fetching user:", error))
  }, [])

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

  return <AuthContext.Provider value={{ user, login, logout, register }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
