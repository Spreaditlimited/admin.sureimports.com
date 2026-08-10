import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { uploadBufferToCloudinary } from "@/lib/cloudinary/upload";

import type { ReportCategorySnapshot } from "./reportData";

type CoverProduct = {
  slug: string;
  title: string;
  coverImageUrl?: string | null;
  coverImagePublicId?: string | null;
  coverImageBytes?: number | null;
};

export type ReportCoverAsset = {
  buffer: Buffer;
  url: string;
  publicId: string | null;
  bytes: number;
  generated: boolean;
};

export type ReportCoverProgress = (detail: string) => void | Promise<void>;

type ReportCoverOptions = {
  revisionNotes?: string;
};

const MAX_COVER_BYTES = 15 * 1024 * 1024;

function localCoverPath(product: CoverProduct) {
  const configured = String(product.coverImageUrl || "").trim();
  if (configured.startsWith("/")) {
    const configuredPath = path.join(process.cwd(), "public", configured);
    if (existsSync(configuredPath)) return configuredPath;
  }

  const fallback = path.join(
    process.cwd(),
    "public/assets/images/intelligence-covers",
    `${product.slug}-v1.png`,
  );
  return existsSync(fallback) ? fallback : null;
}

async function downloadRemoteCover(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(
      `Unable to retrieve the report cover (${response.status}).`,
    );
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error("The configured report cover is not an image.");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > MAX_COVER_BYTES) {
    throw new Error("The configured report cover has an invalid file size.");
  }
  return buffer;
}

export async function resolveReportCoverAsset(
  product: CoverProduct,
): Promise<ReportCoverAsset | null> {
  const configured = String(product.coverImageUrl || "").trim();
  const localPath = localCoverPath(product);
  if (localPath) {
    const buffer = await readFile(localPath);
    const publicUrl = configured.startsWith("/")
      ? configured
      : `/assets/images/intelligence-covers/${product.slug}-v1.png`;
    return {
      buffer,
      url: publicUrl,
      publicId: product.coverImagePublicId || null,
      bytes: buffer.length,
      generated: false,
    };
  }

  if (/^https:\/\//i.test(configured)) {
    const buffer = await downloadRemoteCover(configured);
    return {
      buffer,
      url: configured,
      publicId: product.coverImagePublicId || null,
      bytes: buffer.length,
      generated: false,
    };
  }

  return null;
}

function coverPrompt(snapshot: ReportCategorySnapshot, revisionNotes = "") {
  const products = Array.from(
    new Set(
      snapshot.suppliers
        .flatMap((supplier) => supplier.productsMade)
        .filter(Boolean),
    ),
  ).slice(0, 12);

  return [
    `Create a premium editorial product still-life for a commercial sourcing report about ${snapshot.name}.`,
    products.length
      ? `Show a coherent, realistic selection of these exact product types: ${products.join(", ")}.`
      : "Show a coherent, realistic selection of the products in this category.",
    "Portrait composition in a 2:3 aspect ratio. Arrange the products across the middle and lower-middle of the frame, with generous clean negative space in the top 42 percent and bottom 18 percent for a professionally typeset cover overlay.",
    "Use a deep midnight navy studio background, subtle architectural shadows, controlled warm amber rim lighting and restrained premium highlights. The visual must feel authoritative, commercially useful and consistent with an executive market-intelligence publication.",
    "Photorealistic materials, accurate product geometry, refined art direction, no people unless essential to show wearable products, and no scenery that distracts from the products.",
    "Do not include text, letters, numbers, logos, trademarks, watermarks, badges, borders or invented packaging labels. Do not imitate any named brand.",
    revisionNotes
      ? `Correct every issue identified by the visual quality reviewer: ${revisionNotes}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function generateCoverBuffer(
  snapshot: ReportCategorySnapshot,
  revisionNotes = "",
) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_REPORT_IMAGE_MODEL?.trim() || "gpt-image-2",
      prompt: coverPrompt(snapshot, revisionNotes),
      size: "1024x1536",
      quality: "high",
      n: 1,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Report cover generation failed (${response.status}): ${detail.slice(0, 500)}`,
    );
  }

  const result = await response.json();
  const base64 = String(result?.data?.[0]?.b64_json || "");
  if (!base64) throw new Error("OpenAI did not return a report cover image.");

  const source = Buffer.from(base64, "base64");
  return sharp(source)
    .resize(1024, 1536, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 8, adaptiveFiltering: true })
    .toBuffer();
}

type CoverAssessment = {
  approved: boolean;
  score: number;
  issues: string[];
};

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  return trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
}

async function assessGeneratedCover(
  buffer: Buffer,
  snapshot: ReportCategorySnapshot,
): Promise<CoverAssessment> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const productTypes = Array.from(
    new Set(snapshot.suppliers.flatMap((supplier) => supplier.productsMade)),
  )
    .filter(Boolean)
    .slice(0, 20);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_REPORT_COVER_QA_MODEL?.trim() || "gpt-5.6-sol",
      reasoning: { effort: "high" },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Act as the strict art director for a Sure Imports Supplier Intelligence report about ${snapshot.name}.`,
                `Expected products include: ${productTypes.join(", ")}.`,
                "Approve only if the image is a premium, photorealistic, category-accurate executive publication cover background; the product arrangement is coherent; the top 42% and bottom 18% retain dark usable negative space for typography; the palette is midnight navy with restrained warm amber highlights; and there is no visible text, logo, trademark, watermark, badge, border or invented label.",
                "Reject distorted products, irrelevant categories, clutter, bright lifestyle scenery, weak contrast, prominent people, illegible pseudo-text, brand marks or a composition that will fight the cover typography.",
                'Return only JSON: {"approved":true|false,"score":0-10,"issues":["specific correction"]}. Approval requires a score of at least 8.5 and no critical issue.',
              ].join("\n\n"),
            },
            {
              type: "input_image",
              image_url: `data:image/png;base64,${buffer.toString("base64")}`,
              detail: "high",
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Report cover quality review failed (${response.status}): ${detail.slice(0, 500)}`,
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
  if (!json) throw new Error("Cover quality review returned no JSON result.");
  const assessment = JSON.parse(json);
  const score = Number(assessment?.score || 0);
  const issues = Array.isArray(assessment?.issues)
    ? assessment.issues
        .map((issue: unknown) => String(issue).trim())
        .filter(Boolean)
    : [];
  return {
    approved: Boolean(assessment?.approved) && score >= 8.5,
    score,
    issues,
  };
}

export async function ensureReportCover(
  product: CoverProduct,
  snapshot: ReportCategorySnapshot,
  onProgress?: ReportCoverProgress,
  options: ReportCoverOptions = {},
): Promise<ReportCoverAsset> {
  await onProgress?.("Checking for an approved category cover");
  const existing = await resolveReportCoverAsset(product);
  if (existing) {
    await onProgress?.("Using the approved category cover");
    return existing;
  }

  let buffer: Buffer | null = null;
  let revisionNotes = String(options.revisionNotes || "").trim();
  let finalAssessment: CoverAssessment | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await onProgress?.(
      attempt === 1 && revisionNotes
        ? "Regenerating the cover with the previous art director feedback"
        : attempt === 1
        ? "Generating a product-specific cover image"
        : "Revising the cover from the art director’s feedback",
    );
    buffer = await generateCoverBuffer(snapshot, revisionNotes);
    await onProgress?.(
      attempt === 1
        ? "Reviewing cover accuracy and composition"
        : "Reviewing the revised cover against the quality standard",
    );
    finalAssessment = await assessGeneratedCover(buffer, snapshot);
    if (finalAssessment.approved) break;
    const latestRevisionNotes = finalAssessment.issues.length
      ? finalAssessment.issues.join("; ")
      : `The previous image scored ${finalAssessment.score}/10. Improve product accuracy, composition, negative space and executive visual quality.`;
    revisionNotes = [revisionNotes, latestRevisionNotes]
      .filter(Boolean)
      .join("; ");
  }
  if (!buffer || !finalAssessment?.approved) {
    throw new Error(
      `Generated report cover did not pass visual quality review${finalAssessment ? ` (score ${finalAssessment.score}/10: ${finalAssessment.issues.join("; ") || "quality threshold not met"})` : ""}.`,
    );
  }
  await onProgress?.(
    `Cover approved at ${finalAssessment.score.toFixed(1)}/10; uploading the approved artwork`,
  );
  const upload = await uploadBufferToCloudinary(buffer, {
    folder: "sureimports/supplier-intelligence/covers",
    publicId: `${product.slug}-v1`,
    resourceType: "image",
    overwrite: true,
    useFilename: false,
    uniqueFilename: false,
    tags: ["supplier-intelligence", "report-cover", product.slug],
  });

  return {
    buffer,
    url: upload.url,
    publicId: upload.publicId,
    bytes: upload.bytes || buffer.length,
    generated: true,
  };
}
