import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

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

    return NextResponse.json({
      user: {
        pidUser: user.pidUser,
        userEmail: user.userEmail,
        userFirstname: user.userFirstname,
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return unauthorizedResponse();
  }
}
