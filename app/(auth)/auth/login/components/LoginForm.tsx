"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/context/AuthContext"
import Script from "next/script"
import Image from "next/image"
import { Eye, EyeOff } from "lucide-react"
import styles from "./login.module.css"

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

interface LoginFormProps {
  siteKey: string
}

export default function LoginForm({ siteKey }: LoginFormProps) {
  const [userEmail, setUserEmail] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLocalhost, setIsLocalhost] = useState(false)
  const { login } = useAuth()

  useEffect(() => {
    setIsLocalhost(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!siteKey && !isLocalhost) {
      setError("Captcha is not configured. Contact administrator.")
      return
    }

    try {
      setIsLoading(true)
      const captchaToken = isLocalhost ? "" : await new Promise<string>((resolve, reject) => {
        if (!window.grecaptcha) {
          reject(new Error("Captcha failed to load. Please refresh and try again."))
          return
        }

        window.grecaptcha.ready(() => {
          window.grecaptcha
            ?.execute(siteKey, { action: "login" })
            .then(resolve)
            .catch(() => reject(new Error("Captcha verification could not start.")))
        })
      })

      if (!captchaToken && !isLocalhost) {
        setError("Captcha verification failed. Please refresh and try again.")
        return
      }

      await login(userEmail, userPassword, captchaToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className={styles.layout}>
      <aside className={styles.story}>
        <Image src="/assets/images/auth/bkg.jpg" alt="" fill sizes="50vw" priority className={styles.photo} />
        <a href="https://www.sureimports.com" className={styles.storyLogo}><Image src="/assets/images/logo-white.png" width={180} height={30} alt="Sure Imports" /></a>
        <div className={styles.storyCopy}><span>SURE IMPORTS OPERATIONS</span><h2>Great service.<br />Every order.<br />Every day.</h2><p>One workspace for the team behind procurement, shipping and customer support.</p></div>
      </aside>
      <section className={styles.workspace}><div className={styles.inner}>
        <a href="https://www.sureimports.com" className={styles.mobileLogo}><Image className={styles.lightLogo} src="/assets/images/logo.png" width={180} height={30} alt="Sure Imports" /><Image className={styles.darkLogo} src="/assets/images/logo-white.png" width={180} height={30} alt="Sure Imports" /></a>
        <header><span className={styles.eyebrow}>TEAM WORKSPACE</span><h1>Welcome back.</h1><p>Sign in to manage Sure Imports operations.</p></header>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {siteKey && !isLocalhost && (
              <Script
                src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`}
                strategy="afterInteractive"
              />
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="admin@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 pr-20 text-sm placeholder-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-2 my-auto h-8 px-2 rounded text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && <div role="alert" className="text-sm text-destructive">{error}</div>}

            {!isLocalhost && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                This site is protected by reCAPTCHA and the Google{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a
                  href="https://policies.google.com/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Terms of Service
                </a>{" "}
                apply.
              </p>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-md bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all disabled:opacity-60"
              >
                {isLoading ? "Connecting . . ." : "Sign in"}
              </button>
            </div>
          </form>
        <p className={styles.help}>Need access? Contact your account administrator.</p>
        </div>
      </section>
    </main>
  )
}
