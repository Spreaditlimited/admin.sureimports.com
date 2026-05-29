
// import { useAuth } from "@/lib/AuthContext"
// import React from 'react';

// const AuthLayout = ({ children }: { children: React.ReactNode }) => {
//         return <div className="min-h-screen text-black dark:text-white-dark">{children}</div>;
// };

// export default AuthLayout;
import { AuthProvider } from "@/app/context/AuthContext"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyToken } from "@/lib/jwt"
import { prisma } from "@/lib/prisma"
import type React from "react" // Import React

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value

  if (token) {
    try {
      const payload = verifyToken(token) as { pidUser?: string } | null
      if (payload?.pidUser) {
        const admin = await prisma.admin.findUnique({
          where: { pidUser: payload.pidUser },
          select: { pidUser: true },
        })
        if (admin) {
          redirect("/dashboard")
        }
      }
    } catch {
      // Invalid/expired token: stay on auth pages.
    }
  }

  return <><AuthProvider>{children}</AuthProvider></>
}


