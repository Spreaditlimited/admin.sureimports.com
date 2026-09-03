function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchesServiceOrderSearch(
  query: string,
  values: readonly unknown[],
) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  const source = values.filter(Boolean).join(" ");
  const haystack = normalizeSearchValue(source);
  const queryDigits = query.replace(/\D/g, "");
  if (queryDigits.length >= 3) {
    const searchableDigits = source.replace(/\D/g, "");
    const localDigits = queryDigits.startsWith("0")
      ? queryDigits.slice(1)
      : queryDigits;
    if (
      searchableDigits.includes(queryDigits) ||
      searchableDigits.includes(localDigits)
    ) {
      return true;
    }
  }

  return normalizedQuery
    .split(/\s+/)
    .every((searchTerm) => haystack.includes(searchTerm));
}
