import type { Metadata } from "next"
import { Suspense, type ReactNode } from "react"
import { AuthProvider } from "@/lib/AuthContext"

import { TokenValidator } from "@/lib/TokenValidator"
import Head from "next/head"
import { DashboardLayout } from "./components/dashboard-layout"

export const metadata: Metadata = {
  title: "Sure Imports | Admin Dashboard",
  description: "Admin dashboard",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
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

