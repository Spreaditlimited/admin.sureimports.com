import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { generateToken } from "@/lib/jwt"

const prisma = new PrismaClient()

export async function POST(request: Request) {
  const { userEmail, userPassword, userFirstname } = await request.json()

  try {
    const existingUser = await prisma.admin.findUnique({ where: { userEmail } })
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(userPassword, 10)
    const user = await prisma.admin.create({
      data: { userEmail, userPassword: hashedPassword, userFirstname } as any,
    })

    const token = generateToken({ pidUser: user.pidUser })
    const response = NextResponse.json({ user: { pidUser: user.pidUser, userEmail: user.userEmail, userFirstname: user.userFirstname } })
    response.cookies.set("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" })

    return response
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

