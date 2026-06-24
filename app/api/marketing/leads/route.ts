import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { isSuperAdminStatus } from "@/lib/accessControl"
import { verifyToken } from "@/lib/jwt"
import { getMarketingLeadAnalytics } from "@/lib/marketing/leadAnalytics"
import { prisma } from "@/lib/prisma"

async function requireSuperAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  if (!token) return null

  const payload = verifyToken(token) as { pidUser?: string } | null
  if (!payload?.pidUser) return null

  const admin = await prisma.admin.findUnique({
    where: { pidUser: payload.pidUser },
    select: { pidUser: true, userStatus: true },
  })

  if (!admin || !isSuperAdminStatus(admin.userStatus)) return null
  return admin
}

export async function GET(request: Request) {
  const admin = await requireSuperAdmin()
  if (!admin) {
    return NextResponse.json(
      { statusx: "FORBIDDEN", message: "Only super admins can view marketing analytics" },
      { status: 403 },
    )
  }

  const url = new URL(request.url)
  const analytics = await getMarketingLeadAnalytics(url.searchParams.get("range"))

  return NextResponse.json({ statusx: "SUCCESS", analytics })
}
