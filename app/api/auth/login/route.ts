import { guardPublicForm } from "@/lib/security/publicFormGuard";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/jwt";

export async function POST(request: Request) {
  const securityFailure = await guardPublicForm(request, {
    scope: "admin-login",
    action: "login",
    ipMax: 30,
    identityMax: 10,
  });
  if (securityFailure) return securityFailure;

  try {
    const { userEmail, userPassword, captchaToken } = await request.json();

    if (
      typeof userEmail !== "string" ||
      typeof userPassword !== "string" ||
      !userPassword ||
      userPassword.length > 128
    ) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 },
      );
    }

    const user = await prisma.admin.findUnique({ where: { userEmail } });
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 },
      );
    }

    const isPasswordValid = await bcrypt.compare(
      userPassword,
      user.userPassword as string,
    );
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 },
      );
    }

    const token = generateToken({
      pidUser: user.pidUser,
      userEmail: user.userEmail,
      userFirstname: user.userFirstname,
    });

    const response = NextResponse.json({ message: "Login successful" });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
