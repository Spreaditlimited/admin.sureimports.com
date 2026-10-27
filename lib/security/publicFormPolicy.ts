/** Reject links/markup in names without excluding non-Latin names. */
export function validPublicName(value: unknown, required = false): boolean {
  if (value == null || value === "") return !required;
  if (typeof value !== "string") return false;
  const name = value.trim();
  return (
    (!required || name.length > 0) &&
    name.length <= 80 &&
    !/[<>\r\n\x00-\x1f]|https?:|www\.|\S+\.[a-z]{2,}(?:\b|\/)/i.test(name)
  );
}

export function publicFormError(
  body: Record<string, unknown>,
  signup: boolean,
): string | null {
  for (const key of [
    "userFirstname",
    "userLastname",
    "first_name",
    "last_name",
    "name",
  ]) {
    if (
      key in body &&
      !validPublicName(
        body[key],
        signup && key !== "userLastname" && key !== "last_name",
      )
    ) {
      return "Please enter a valid name without links (maximum 80 characters).";
    }
  }
  const email = body.email ?? body.userEmail;
  if (
    email !== undefined &&
    (typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return "Please enter a valid email address.";
  }
  if (signup) {
    const password = body.password ?? body.userPassword;
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    )
      return "Use a password between 8 and 128 characters.";
    if ("confirmPassword" in body && password !== body.confirmPassword)
      return "Passwords must match.";
  }
  if (body.website) return "Unable to accept this submission.";
  return null;
}
