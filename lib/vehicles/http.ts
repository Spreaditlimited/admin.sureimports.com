export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new Error("Invalid request origin.");
}
export function inputText(
  value: unknown,
  label: string,
  max: number,
  required = true,
) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw new Error(`Enter a valid ${label}.`);
  return value.trim();
}
export function failure(error: unknown) {
  console.error("Vehicle request failed", error);
  return Response.json(
    {
      message:
        "We could not complete this request. Please refresh and try again.",
    },
    { status: 500 },
  );
}
