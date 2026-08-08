export type SupplierSearchQueryAssessment = {
  status: "valid" | "needs_clarification" | "out_of_scope";
  canonicalQuery: string | null;
  message: string;
};

const CONTEXT_ONLY_WORDS = new Set([
  "area",
  "business",
  "buyer",
  "customer",
  "city",
  "company",
  "country",
  "idea",
  "market",
  "nearby",
  "shop",
  "store",
  "supermarket",
  "target",
]);

const OUT_OF_SCOPE_PATTERN =
  /\b(?:customers?|buyers?|target\s+(?:market|audience)|market\s+(?:demand|research|size)|where\s+to\s+sell|how\s+to\s+sell|business\s+ideas?|profitable\s+(?:business|products?)|sales\s+strategy)\b/i;
const CONTEXT_BOUNDARY_PATTERN =
  /\b(?:for\s+(?:my|our)\s+(?:area|market|customers?|business|target\s+(?:market|audience))|in\s+(?:my|our)\s+(?:area|market|city|country)|near\s+me|target\s+(?:market|audience)|where\s+to\s+sell|how\s+to\s+sell|market\s+(?:demand|research|size))\b/i;

function productTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(
      (token) =>
        token.length > 1 &&
        !CONTEXT_ONLY_WORDS.has(token) &&
        ![
          "find",
          "looking",
          "need",
          "research",
          "search",
          "source",
          "want",
          "supplier",
          "suppliers",
          "manufacturer",
          "manufacturers",
          "factory",
          "factories",
          "china",
          "chinese",
          "wholesale",
        ].includes(token),
    );
}

export function assessSupplierSearchQuery(
  value: string,
): SupplierSearchQueryAssessment {
  const query = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
  const boundary = query.search(CONTEXT_BOUNDARY_PATTERN);
  const candidate = (boundary >= 0 ? query.slice(0, boundary) : query)
    .replace(
      /^(?:please\s+)?(?:i\s+(?:am\s+)?(?:want|need|looking\s+for)|we\s+(?:want|need)|find|search\s+for|research|source)\s+/i,
      "",
    )
    .replace(/\s+(?:suppliers?|manufacturers?|factories|wholesalers?)$/i, "")
    .replace(/[?.!,;:]+$/g, "")
    .trim();

  if (!query || productTokens(candidate).length === 0) {
    return {
      status: OUT_OF_SCOPE_PATTERN.test(query)
        ? "out_of_scope"
        : "needs_clarification",
      canonicalQuery: null,
      message:
        "This request does not name a specific physical product. Reject it and return the credit instead of starting external research.",
    };
  }

  if (/^(?:what|which|where|how|who|why)\b/i.test(query)) {
    return {
      status: "out_of_scope",
      canonicalQuery: null,
      message:
        "This is a business or market-research question, not a physical-product supplier search.",
    };
  }

  return { status: "valid", canonicalQuery: candidate || query, message: "" };
}
