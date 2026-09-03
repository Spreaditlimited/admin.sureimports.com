export function normalizeWhatsAppNumber(
  value: string | number | null | undefined,
  country = "",
) {
  if (value == null) return null;
  const display = String(value).trim();
  if (!display) return null;

  let digits = display.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  const isNigeria = !country || country.toLowerCase().includes("nigeria");
  if (digits.startsWith("2340")) digits = `234${digits.slice(4)}`;
  if (isNigeria && digits.startsWith("0")) digits = `234${digits.slice(1)}`;
  if (isNigeria && digits.length === 10 && /^[789]/.test(digits)) {
    digits = `234${digits}`;
  }

  if (!isNigeria && digits.startsWith("0")) return null;
  return digits.length >= 8 && digits.length <= 15 ? { display, digits } : null;
}

export function buildWhatsAppUrl(digits: string, message: string) {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
