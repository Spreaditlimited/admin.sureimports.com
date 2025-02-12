"use client"

import { useState } from "react"
import { useAuth } from "@/lib/AuthContext"
import Image from "next/image"
import Link from "next/link"
import { Mail, Lock } from "lucide-react"

export default function LoginForm() {

    const [userEmail, setUserEmail] = useState("")
    const [userPassword, setUserPassword] = useState("")
    const [error, setError] = useState("")
    const { login } = useAuth()
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      try {
        await login(userEmail, userPassword)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      }
    }

  return (
    <>
    <div className="min-h-screen w-full flex">
      {/* Left Section */}
      {/* <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700 flex-col p-8"> */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-purple-200 via-blue-100 to-blue-300 flex-col p-8">
        <div className="w-32">
          <Image
            src="/assets/images/logos/logo1.png"
            alt="Printin.ng Logo"
            width={120}
            height={40}
            className="object-contain"
          />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Image
            src="/assets/images/auth/bkg.jpg"
            alt="3D Printer Illustration"
            width={600}
            height={500}
            className="object-contain rounded-xl"
          />
        </div>
        <div className="text-white/70 text-sm">© 2025. All Rights Reserved.</div>
      </div>

      {/* Right Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-blue-600">SIGN IN</h1>
            <p className="text-gray-500">Enter your email and password to login</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Enter Email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Enter Password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-500">
                Keep me logged-in for 1 week
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-white text-sm font-semibold rounded-lg bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              SIGN IN
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <Link href="/auth/register" className="text-blue-600 hover:underline">
                SIGN UP
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
    </>
  )
}

