import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

const prisma = new PrismaClient()

export async function GET() {
  const cookieStore = cookies()
  const token = (await cookieStore).get("token")?.value

  if (!token) {
                // Token is invalid, log out the user
                const response = NextResponse.json({ message: 'Invalid token' }, { status: 401 })
                response.cookies.set('token', '', { 
                  httpOnly: true, 
                  secure: process.env.NODE_ENV === 'production',
                  expires: new Date(0),
                  sameSite: 'strict'
                })
                return response
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const payload = verifyToken(token)
    if (!payload || typeof payload !== "object" || !("pidUser" in payload)) {

            // Token is invalid, log out the user
            const response = NextResponse.json({ message: 'Invalid token' }, { status: 401 })
            response.cookies.set('token', '', { 
              httpOnly: true, 
              secure: process.env.NODE_ENV === 'production',
              expires: new Date(0),
              sameSite: 'strict'
            })
            return response

      //return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    const user = await prisma.admin.findUnique({ where: { pidUser: payload.pidUser as string } })
    if (!user) {
                  // Token is invalid, log out the user
                  const response = NextResponse.json({ message: 'Invalid token' }, { status: 401 })
                  response.cookies.set('token', '', { 
                    httpOnly: true, 
                    secure: process.env.NODE_ENV === 'production',
                    expires: new Date(0),
                    sameSite: 'strict'
                  })
                  return response
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: { pidUser: user.pidUser, userEmail: user.userEmail, userFirstname: user.userFirstname } })
  } catch (error) {
                // Token is invalid, log out the user
                const response = NextResponse.json({ message: 'Invalid token' }, { status: 401 })
                response.cookies.set('token', '', { 
                  httpOnly: true, 
                  secure: process.env.NODE_ENV === 'production',
                  expires: new Date(0),
                  sameSite: 'strict'
                })
                return response
    console.error("Auth error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

