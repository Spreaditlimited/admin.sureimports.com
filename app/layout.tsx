import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"
import { AuthProvider } from "@/lib/AuthContext"
import { AlertProvider } from "./context/AlertContext"

export const metadata: Metadata = {
  title: "SureImports | Admin Dashboard",
  description: "Admin dashboard",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              var theme = localStorage.getItem('theme');
              if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            })();
          `,
          }}
        />
        <AuthProvider>
          <AlertProvider>
            {children}
          </AlertProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

