import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

const prisma = new PrismaClient()

export async function GET() {
  const cookieStore = cookies()
  const token = (await cookieStore).get("token")?.value

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const payload = verifyToken(token)
    if (!payload || typeof payload !== "object" || !("pidUser" in payload)) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    const user = await prisma.admin.findUnique({ where: { pidUser: payload.pidUser as string } })
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: { pidUser: user.pidUser, userEmail: user.userEmail, userFirstname: user.userFirstname } })
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

