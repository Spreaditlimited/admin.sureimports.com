import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { isSuperAdminStatus } from "@/lib/accessControl";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  const unauthorizedResponse = () => {
    const response = NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      path: "/",
      sameSite: "strict",
    });
    return response;
  };

  if (!token) {
    return unauthorizedResponse();
  }

  try {
    const payload = verifyToken(token);
    if (!payload || typeof payload !== "object" || !("pidUser" in payload)) {
      return unauthorizedResponse();
    }

    const user = await prisma.admin.findUnique({
      where: { pidUser: payload.pidUser as string },
    });

    if (!user) {
      return unauthorizedResponse();
    }

    let serviceKeys: string[] = [];
    if (!isSuperAdminStatus(user.userStatus)) {
      try {
        const permissions = await prisma.admin_permissions.findMany({
          where: {
            pidUser: user.pidUser,
            canView: true,
          },
          select: { serviceKey: true },
        });
        serviceKeys = permissions.map((permission) => permission.serviceKey);
      } catch {
        serviceKeys = [];
      }
    }

    return NextResponse.json({
      user: {
        pidUser: user.pidUser,
        userEmail: user.userEmail,
        userFirstname: user.userFirstname,
        userLastname: user.userLastname,
        userImage: user.userImage,
        userStatus: user.userStatus,
        serviceKeys,
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return unauthorizedResponse();
  }
}
