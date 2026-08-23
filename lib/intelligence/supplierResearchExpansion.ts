export type SupplierIdentity = {
  supplierName?: string | null;
  officialWebsite?: string | null;
};

export function normalizeSupplierResearchCount(value: unknown) {
  const count = Number(value ?? 3);
  if (!Number.isFinite(count)) return 3;
  return Math.min(10, Math.max(1, Math.round(count)));
}

export function normalizeSupplierNameIdentity(value?: string | null) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeSupplierWebsiteIdentity(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return raw
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .split('?')[0]
      .split('#')[0];
  }
}

export function supplierMatchesExisting(
  candidate: SupplierIdentity,
  existingSuppliers: SupplierIdentity[],
) {
  const candidateName = normalizeSupplierNameIdentity(candidate.supplierName);
  const candidateWebsite = normalizeSupplierWebsiteIdentity(
    candidate.officialWebsite,
  );

  return existingSuppliers.some((supplier) => {
    const existingName = normalizeSupplierNameIdentity(supplier.supplierName);
    const existingWebsite = normalizeSupplierWebsiteIdentity(
      supplier.officialWebsite,
    );
    return Boolean(
      (candidateName && existingName && candidateName === existingName) ||
        (candidateWebsite &&
          existingWebsite &&
          candidateWebsite === existingWebsite),
    );
  });
}

export function filterUniqueNewSuppliers<T extends SupplierIdentity>(
  candidates: T[],
  existingSuppliers: SupplierIdentity[],
) {
  const accepted: T[] = [];

  for (const candidate of candidates) {
    if (
      supplierMatchesExisting(candidate, existingSuppliers) ||
      supplierMatchesExisting(candidate, accepted)
    ) {
      continue;
    }
    accepted.push(candidate);
  }

  return accepted;
}
