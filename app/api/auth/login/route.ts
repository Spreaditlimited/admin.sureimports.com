import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/jwt";

function shouldBypassCaptcha(request: Request) {
  if (process.env.DISABLE_CAPTCHA === "true") return true;
  if (process.env.NODE_ENV === "development") return true;

  const host = request.headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

export async function POST(request: Request) {
  try {
    const { userEmail, userPassword, captchaToken } = await request.json();

    const bypassCaptcha = shouldBypassCaptcha(request);

    if (!userEmail || !userPassword || (!captchaToken && !bypassCaptcha)) {
      return NextResponse.json(
        { message: "Email, password and captcha are required" },
        { status: 400 }
      );
    }

    if (!bypassCaptcha) {
      const captchaSecret = process.env.GOOGLE_CAPTCHA_SECRET_KEY;
      if (!captchaSecret) {
        return NextResponse.json(
          { message: "Captcha secret key is not configured" },
          { status: 500 }
        );
      }

      const captchaVerifyResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: captchaSecret,
          response: captchaToken,
        }),
      });

      const captchaVerifyData = await captchaVerifyResponse.json();
      const minimumCaptchaScore = Number(process.env.GOOGLE_CAPTCHA_MIN_SCORE || 0.5);
      if (
        !captchaVerifyData?.success ||
        captchaVerifyData?.action !== "login" ||
        Number(captchaVerifyData?.score || 0) < minimumCaptchaScore
      ) {
        return NextResponse.json(
          { message: "Captcha verification failed" },
          { status: 400 }
        );
      }
    }

    const user = await prisma.admin.findUnique({ where: { userEmail } });
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(
      userPassword,
      user.userPassword as string
    );
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
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
      { status: 500 }
    );
  }
}
