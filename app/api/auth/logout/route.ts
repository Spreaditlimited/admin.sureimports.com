import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import { NextResponse } from "next/server";

export async function POST() {
  const pushCookie = process.env.NODE_ENV === "production" ? "__Host-si-support-push" : "si-support-push";
  if (process.env.SUPPORT_CHAT_ENABLED === "true") {
    try {
      const jar = await cookies();
      const device = jar.get(pushCookie)?.value;
      const token = jar.get("token")?.value;
      const identity = token ? verifyToken(token) as {pidUser?: string} | null : null;
      if (device && /^[a-f0-9]{32}$/.test(device) && identity?.pidUser) {
        await prisma.$executeRaw`DELETE FROM support_push_subscriptions WHERE id=${device} AND adminId=${identity.pidUser}`;
      }
    } catch { /* Logging out must still succeed if notification storage is unavailable. */ }
  }
  const response = NextResponse.json({ message: "Logged out successfully" });
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
    sameSite: "strict",
  });
  response.cookies.set(pushCookie, "", {httpOnly:true,secure:process.env.NODE_ENV === "production",expires:new Date(0),path:"/",sameSite:"strict"});
  return response;
}
