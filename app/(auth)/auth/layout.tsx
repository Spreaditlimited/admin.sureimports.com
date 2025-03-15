
// import { useAuth } from "@/lib/AuthContext"
// import React from 'react';

// const AuthLayout = ({ children }: { children: React.ReactNode }) => {
//         return <div className="min-h-screen text-black dark:text-white-dark">{children}</div>;
// };

// export default AuthLayout;
import { AuthProvider } from "@/app/context/AuthContext"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type React from "react" // Import React

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const token = (await cookieStore).get("token")

  if (token) {
    redirect("/dashboard")
  }

  return <><AuthProvider>{children}</AuthProvider></>
}



