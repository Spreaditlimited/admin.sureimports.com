import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { isSuperAdminStatus } from "@/lib/accessControl"
import { verifyToken } from "@/lib/jwt"
import { prisma } from "@/lib/prisma"
import { generateBlogLeadMagnet, getBlogLeadMagnet } from "@/lib/marketing/blogLeadMagnets"

async function requireSuperAdminApiAccess() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const payload = verifyToken(token) as { pidUser?: string } | null
  if (!payload?.pidUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const admin = await prisma.admin.findUnique({
    where: { pidUser: payload.pidUser },
    select: { userStatus: true },
  })

  if (!admin || !isSuperAdminStatus(admin.userStatus)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  return null
}

export async function GET(request: Request) {
  const authError = await requireSuperAdminApiAccess()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const pidBlog = String(searchParams.get("pidBlog") || "").trim()
  if (!pidBlog) {
    return NextResponse.json({ success: false, error: "pidBlog is required." }, { status: 400 })
  }

  const leadMagnet = await getBlogLeadMagnet(pidBlog)
  return NextResponse.json({ success: true, data: leadMagnet })
}

export async function POST(request: Request) {
  const authError = await requireSuperAdminApiAccess()
  if (authError) return authError

  const body = await request.json().catch(() => ({}))
  const pidBlog = String(body?.pidBlog || "").trim()
  if (!pidBlog) {
    return NextResponse.json({ success: false, error: "pidBlog is required." }, { status: 400 })
  }

  try {
    const leadMagnet = await generateBlogLeadMagnet(pidBlog)
    return NextResponse.json({ success: true, data: leadMagnet })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lead magnet generation failed."
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
