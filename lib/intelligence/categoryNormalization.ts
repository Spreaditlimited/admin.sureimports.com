const GENERIC_CATEGORY_WORDS = new Set([
  'product',
  'products',
  'item',
  'items',
  'goods',
  'supply',
  'supplies',
  'supplier',
  'suppliers',
  'manufacturer',
  'manufacturers',
  'factory',
  'factories',
  'set',
  'sets',
]);

function singularize(token: string) {
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('ses') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('s') && token.length > 3) return token.slice(0, -1);
  return token;
}

export function normalizeCategoryTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bgensets?\b/g, ' generator ')
    .replace(/\bgenerator\s+sets?\b/g, ' generator ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map((token) => singularize(token.trim()))
    .filter((token) => token.length > 1 && !GENERIC_CATEGORY_WORDS.has(token));
}

export function canonicalCategoryKey(value: string) {
  return Array.from(new Set(normalizeCategoryTokens(value))).sort().join('-');
}

export function categoriesAreCloselyRelated(a: string, b: string) {
  const aTokens = new Set(normalizeCategoryTokens(a));
  const bTokens = new Set(normalizeCategoryTokens(b));
  if (!aTokens.size || !bTokens.size) return false;

  const intersection = Array.from(aTokens).filter((token) => bTokens.has(token));
  const smallerSize = Math.min(aTokens.size, bTokens.size);

  return intersection.length === smallerSize;
}

