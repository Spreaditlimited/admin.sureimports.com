import type { Metadata } from "next"
import { Suspense, type ReactNode } from "react"
import "./globals.css"
import { AuthProvider } from "@/lib/AuthContext"
import { AlertProvider } from "./context/AlertContext"
import { TokenValidator } from "@/lib/TokenValidator"
import Head from "next/head"

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

      {/* <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head> */}
      
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
        <Suspense fallback={<div>Loading...</div>}>  
        <AuthProvider>
              <TokenValidator>
                    <AlertProvider>
                      {children}
                    </AlertProvider>
              </TokenValidator>                                             
        </AuthProvider>
        </Suspense>
      </body>
    </html>
  )
}

