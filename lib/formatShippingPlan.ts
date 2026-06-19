export function formatShippingPlanDisplay(value: string | null | undefined) {
  const source = String(value || '').trim();

  if (!source) {
    return 'N/A';
  }

  return source
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
