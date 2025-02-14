
import { TokenValidator } from "@/lib/TokenValidator"
import { AuthProvider } from "@/lib/XAuthContext"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type React from "react" // Import React

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
                  <AuthProvider>
                      <TokenValidator>
                            {children}
                      </TokenValidator>                                             
                  </AuthProvider>
         </>
}