import { shouldBypassLocalCaptcha as isLocalDevelopmentHost } from "./localCaptchaBypass";

export async function verifyRecaptchaToken(
  token: string | undefined | null,
  request?: Request,
  expectedAction?: string,
): Promise<boolean> {
  const secret = process.env.GOOGLE_CAPTCHA_SECRET_KEY;

  if (request && isLocalDevelopmentHost(new URL(request.url).hostname))
    return true;

  // Production/preview fail closed, including when configuration is missing.
  if (!secret || !request) return false;

  if (typeof token !== "string" || !token.trim() || token.length > 8192)
    return false;

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret,
          response: token,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) return false;

    const payload = (await response.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
      hostname?: string;
      challenge_ts?: string;
      "error-codes"?: string[];
    };

    if (!payload.success) {
      console.error("reCAPTCHA verification rejected:", {
        errorCodes: payload["error-codes"] || [],
      });
      return false;
    }

    if (expectedAction && payload.action !== expectedAction) return false;

    const expectedHost = (
      request.headers.get("host") || new URL(request.url).host
    )
      .toLowerCase()
      .replace(/:\d+$/, "")
      .replace(/\.$/, "");
    if (payload.hostname?.toLowerCase().replace(/\.$/, "") !== expectedHost)
      return false;
    // Google enforces token expiry and single use. challenge_ts describes the
    // challenge load, not necessarily the moment execute() issued this token.

    if (expectedAction && typeof payload.score !== "number") return false;

    if (
      typeof payload.score === "number" &&
      (!Number.isFinite(payload.score) ||
        payload.score < 0.5 ||
        payload.score > 1)
    )
      return false;

    return true;
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return false;
  }
}
