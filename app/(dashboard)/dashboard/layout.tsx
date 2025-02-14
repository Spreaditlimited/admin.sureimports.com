
import { TokenValidator } from "@/lib/TokenValidator"
import { AuthProvider } from "@/lib/AuthContext"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type React from "react" // Import React
import { Suspense } from "react"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const token = (await cookieStore).get("token")

  if (!token) {
    redirect("/auth/login")
  }

  return <>
              <Suspense fallback={<div>Loading...</div>}>
                  <AuthProvider>
                            {children}                                     
                  </AuthProvider>
              </Suspense> 
         </>
}