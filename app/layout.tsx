import type { Metadata } from "next"
import { Suspense, type ReactNode } from "react"
import "./globals.css"
import { AlertProvider } from "./context/AlertContext"
import Head from "next/head"

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
    <html lang="en" suppressHydrationWarning>

      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
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
            <AlertProvider>
              {children}
            </AlertProvider>
        </Suspense>

      </body>
    </html>
  )
}
