"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"



interface User {
  pidUser: string
  userEmail: string
  userFirstname?: string
  userLastname?: string
  userImage?: string
  userStatus?: string | null
  serviceKeys?: string[]
}



interface AuthContextType {
  user: User | null
  loading: boolean
  login: (userEmail: string, userPassword: string) => Promise<void>
  logout: () => Promise<void>
  register: (userEmail: string, userPassword: string, userFirstname?: string) => Promise<void>
  checkAuth: () => Promise<boolean>
}



const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()


  //Function to check authentication status
  const checkAuth = useCallback(async () => {
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }, [])



  //Check authentication status on initial load
  useEffect(() => {
    void checkAuth()
  }, [checkAuth])
  


  //Login function
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



  //Logout function
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    router.push("/auth/login")
  }



  //Register function
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

  return <AuthContext.Provider value={{ user, loading, login, logout, register, checkAuth }}>{children}</AuthContext.Provider>
}



//Custom hook to use the Auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
