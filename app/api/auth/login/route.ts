import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { generateToken } from "@/lib/jwt"

const prisma = new PrismaClient()

export async function POST(request: Request) {
  const { userEmail, userPassword } = await request.json()

  try {
    const user = await prisma.admin.findUnique({ where: { userEmail } })
    if (!user) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 400 })
    }

    const isPasswordValid = await bcrypt.compare(userPassword, user.userPassword as string)
    if (!isPasswordValid) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 400 })
    }

    const token = generateToken({ pidUser: user.pidUser, userEmail: user.userEmail, userFirstname: user.userFirstname })
    const response = NextResponse.json({ user: { pidUser: user.pidUser, userEmail: user.userEmail, userFirstname: user.userFirstname } })
    response.cookies.set("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

