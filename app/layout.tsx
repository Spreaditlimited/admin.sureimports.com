import type { Metadata } from "next"
import { Suspense, type ReactNode } from "react"
import "./globals.css"
import '../design-system/tokens.css';
import '../design-system/components.css';
import { AlertProvider } from "./context/AlertContext"
import Head from "next/head"

export const metadata: Metadata = {
  title: "Sure Imports | Admin Dashboard",
  description: "Admin dashboard",
  manifest: "/support.webmanifest",
  appleWebApp: { capable: true, title: "Sure Imports Admin", statusBarStyle: "default" },
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html data-si-foundation="1" lang="en" suppressHydrationWarning>

      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              var theme = 'light';
              try { theme = localStorage.getItem('theme') || 'light'; } catch (_) {}
              if (theme === 'dark') {
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
