import type { ReportCategorySnapshot } from "./reportData";

export type GeneratedReportSeoProfile = {
  primaryKeyword: string;
  secondaryKeywords: string[];
  metaTitle: string;
  metaDescription: string;
  heading: string;
  introduction: string;
  buyerValue: string;
  products: string[];
  checks: string[];
  audiences: string[];
  faqs: Array<{ question: string; answer: string }>;
};

function clean(value: unknown, max: number) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function list(value: unknown, maxItems: number, maxLength = 180) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => clean(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  return trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
}

function normalizeSeoProfile(value: any): GeneratedReportSeoProfile {
  const faqs = Array.isArray(value?.faqs)
    ? value.faqs
        .map((faq: any) => ({
          question: clean(faq?.question, 220),
          answer: clean(faq?.answer, 700),
        }))
        .filter((faq: { question: string; answer: string }) =>
          Boolean(faq.question && faq.answer),
        )
        .slice(0, 5)
    : [];

  const profile: GeneratedReportSeoProfile = {
    primaryKeyword: clean(value?.primaryKeyword, 120),
    secondaryKeywords: list(value?.secondaryKeywords, 8, 120),
    metaTitle: clean(value?.metaTitle, 68),
    metaDescription: clean(value?.metaDescription, 165),
    heading: clean(value?.heading, 180),
    introduction: clean(value?.introduction, 900),
    buyerValue: clean(value?.buyerValue, 1200),
    products: list(value?.products, 8, 180),
    checks: list(value?.checks, 8, 220),
    audiences: list(value?.audiences, 8, 180),
    faqs,
  };

  const requiredText = [
    profile.primaryKeyword,
    profile.metaTitle,
    profile.metaDescription,
    profile.heading,
    profile.introduction,
    profile.buyerValue,
  ];
  if (
    requiredText.some((item) => !item) ||
    profile.secondaryKeywords.length < 3 ||
    profile.products.length < 3 ||
    profile.checks.length < 3 ||
    profile.audiences.length < 3 ||
    profile.faqs.length < 3
  ) {
    throw new Error("The generated report product-page copy was incomplete.");
  }

  return profile;
}

function seoPrompt(snapshot: ReportCategorySnapshot) {
  const productTypes = Array.from(
    new Set(snapshot.suppliers.flatMap((supplier) => supplier.productsMade)),
  ).filter(Boolean);

  const shape: GeneratedReportSeoProfile = {
    primaryKeyword: "commercial search phrase",
    secondaryKeywords: [
      "supporting keyword 1",
      "supporting keyword 2",
      "supporting keyword 3",
    ],
    metaTitle: "Natural title, no more than 60 characters",
    metaDescription: "Natural description, no more than 155 characters",
    heading: "Conversational page heading",
    introduction: "Human opening paragraph",
    buyerValue: "Human explanation of what the buyer can do with the report",
    products: [
      "Specific product group 1",
      "Specific product group 2",
      "Specific product group 3",
    ],
    checks: ["Commercial check 1", "Commercial check 2", "Commercial check 3"],
    audiences: ["Buyer type 1", "Buyer type 2", "Buyer type 3"],
    faqs: [
      { question: "Question 1", answer: "Useful answer 1" },
      { question: "Question 2", answer: "Useful answer 2" },
      { question: "Question 3", answer: "Useful answer 3" },
    ],
  };

  return [
    "You are the senior SEO strategist and commercial editor for Sure Imports, a China sourcing and shipping company serving buyers worldwide.",
    `Prepare the complete product-page SEO profile for a paid Supplier Intelligence PDF covering: ${snapshot.name}.`,
    `The report contains ${snapshot.suppliers.length} reviewed direct manufacturers. Product evidence across the report includes: ${productTypes.slice(0, 30).join(", ")}.`,
    "Use web search to assess the language commercial buyers actually use when looking for Chinese manufacturers in this category. Select one realistic primary keyword and a tightly related keyword cluster. Do not invent search-volume figures.",
    "Write in the natural, conversational style of a knowledgeable sourcing adviser. Create demand by making the sourcing problem and the value of a focused manufacturer shortlist clear. Avoid robotic SEO repetition, generic marketing filler, exaggerated guarantees and marketplace-list language.",
    "The page must make clear that these are reviewed direct manufacturers, that official contact routes are included, and that Sure Imports can arrange physical factory verification in China for high-value purchases. Do not mention prices in the copy.",
    "Use concrete product categories rather than phrases such as relevant products. Write for buyers in any country.",
    "Return only valid JSON matching this exact structure:",
    JSON.stringify(shape),
  ].join("\n\n");
}

export async function generateReportSeoProfile(
  snapshot: ReportCategorySnapshot,
): Promise<GeneratedReportSeoProfile> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_REPORT_SEO_MODEL?.trim() || "gpt-5.6-sol",
      reasoning: { effort: "max" },
      tools: [{ type: "web_search_preview" }],
      input: seoPrompt(snapshot),
    }),
    signal: AbortSignal.timeout(240_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Report SEO research failed (${response.status}): ${detail.slice(0, 500)}`,
    );
  }

  const data = await response.json();
  const outputText =
    data.output_text ||
    data.output
      ?.flatMap((item: any) => item.content || [])
      ?.map((content: any) => content.text || "")
      ?.join("\n") ||
    "";
  const json = extractJson(outputText);
  if (!json) throw new Error("OpenAI did not return report SEO JSON.");
  return normalizeSeoProfile(JSON.parse(json));
}
