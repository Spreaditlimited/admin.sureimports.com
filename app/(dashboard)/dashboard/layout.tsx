import type { Metadata } from "next"
import { Suspense, type ReactNode } from "react"
import { AuthProvider } from "@/lib/AuthContext"
import { TokenValidator } from "@/lib/TokenValidator"
import { DashboardLayout } from "./components/dashboard-layout"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyToken } from "@/lib/jwt"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = {
  title: "Sure Imports | Admin Dashboard",
  description: "Admin dashboard",
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  if (!token) {
    redirect("/auth/login")
  }

  try {
    const payload = verifyToken(token) as { pidUser?: string } | null
    if (!payload?.pidUser) {
      redirect("/auth/login")
    }

    const admin = await prisma.admin.findUnique({
      where: { pidUser: payload.pidUser },
      select: { pidUser: true },
    })

    if (!admin) {
      redirect("/auth/login")
    }
  } catch {
    redirect("/auth/login")
  }

  return (

        <Suspense fallback={<div>Loading...</div>}>  
            <AuthProvider>
                <TokenValidator>
                  <DashboardLayout>
                      {children}
                  </DashboardLayout>
                </TokenValidator>                                             
            </AuthProvider>
        </Suspense>


  )
}
