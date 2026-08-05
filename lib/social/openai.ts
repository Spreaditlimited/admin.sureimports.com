import { SURE_IMPORTS_URL, SURE_IMPORTS_WHATSAPP } from '@/lib/social/config';
import type { SocialSource } from '@/lib/social/sources';

export type SocialCopy = {
  headline: string;
  accentPhrase: string;
  subtext: string;
  actionLabel: string;
  instagramCaption: string;
  facebookCaption: string;
  imagePrompt: string;
  demandRationale: string;
  includeWhatsapp: boolean;
};

const copySchema = {
  type: 'object', additionalProperties: false,
  properties: {
    headline: { type: 'string' }, accentPhrase: { type: 'string' }, subtext: { type: 'string' },
    actionLabel: { type: 'string' }, instagramCaption: { type: 'string' }, facebookCaption: { type: 'string' },
    imagePrompt: { type: 'string' }, demandRationale: { type: 'string' }, includeWhatsapp: { type: 'boolean' },
  },
  required: ['headline', 'accentPhrase', 'subtext', 'actionLabel', 'instagramCaption', 'facebookCaption', 'imagePrompt', 'demandRationale', 'includeWhatsapp'],
};

function outputText(payload: any) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  return payload?.output?.flatMap((item: any) => item?.content || []).map((item: any) => item?.text).filter((item: unknown) => typeof item === 'string').join('');
}

async function structuredResponse(name: string, schema: object, system: string, user: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Missing OPENAI_API_KEY in admin environment.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.SOCIAL_TEXT_MODEL || 'gpt-5.6-terra',
      reasoning: { effort: 'medium' },
      input: [{ role: 'system', content: system }, { role: 'user', content: user }],
      text: { verbosity: 'medium', format: { type: 'json_schema', name, strict: true, schema } },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  const text = outputText(await response.json());
  if (!text) throw new Error('OpenAI returned no structured content.');
  return JSON.parse(text);
}

function words(value: string) { return value.trim().split(/\s+/).filter(Boolean).length; }

function priceLike(value: string) {
  const clean = value.replace(/\+234\s*803\s*764\s*9956/g, '');
  return /(?:₦|\$|£|€|¥|NGN|USD|GBP|EUR|CNY|RMB)\s*[\d,.]+|[\d,.]+\s*(?:naira|dollars?|pounds?|yuan)|\b(?:price|pricing|costs?)\s*(?:is|of|:)?\s*[\d,.]+/i.test(clean);
}

export function validateSocialCopy(copy: SocialCopy) {
  const errors: string[] = [];
  if (words(copy.headline) > 12) errors.push('Headline must contain at most 12 words.');
  if (copy.headline.length > 70) errors.push('Headline must contain at most 70 characters.');
  if (!copy.accentPhrase || !copy.headline.toLowerCase().endsWith(copy.accentPhrase.toLowerCase())) errors.push('Orange emphasis must be the exact final phrase in the headline.');
  if (copy.subtext.length > 150) errors.push('Subtext must contain at most 150 characters.');
  if (copy.actionLabel.length > 24) errors.push('Action label must contain at most 24 characters.');
  for (const [label, caption] of [['Instagram', copy.instagramCaption], ['Facebook', copy.facebookCaption]] as const) {
    const count = words(caption);
    if (count < 100 || count > 200) errors.push(`${label} caption must contain 100–200 words; received ${count}.`);
    if (!caption.includes(SURE_IMPORTS_URL)) errors.push(`${label} caption must include the Sure Imports website.`);
  }
  const all = [copy.headline, copy.subtext, copy.actionLabel, copy.instagramCaption, copy.facebookCaption].join('\n');
  if (priceLike(all)) errors.push('Prices and currency amounts are not permitted.');
  if (/\b(?:guaranteed|risk[- ]free|100%|cheapest|number one|#1)\b/i.test(all)) errors.push('Unsupported guarantees or superlatives are not permitted.');
  if (copy.includeWhatsapp) {
    for (const caption of [copy.instagramCaption, copy.facebookCaption]) {
      if (!caption.includes(`WhatsApp only: ${SURE_IMPORTS_WHATSAPP}`)) errors.push('WhatsApp CTA must be labelled “WhatsApp only”.');
    }
  }
  if (errors.length) throw new Error(errors.join(' '));
}

export async function generateSocialCopy(source: SocialSource): Promise<SocialCopy> {
  const copy = await structuredResponse(
    'sure_imports_social_campaign', copySchema,
    `You are Sure Imports' senior demand-generation strategist. Create desire by making an unresolved commercial risk or valuable outcome concrete, showing the consequence of delay or poor control, and positioning Sure Imports as the credible bridge. Be specific, useful and calm—not sensational. Never include prices, currency amounts, discounts, invented statistics, unsupported guarantees or fake urgency. Return only the requested JSON.`,
    `Create a ${source.pillar === 'educational' ? 'demand-led educational' : 'bottom-of-funnel'} square social campaign from this approved source.
Source title: ${source.title}
Source URL: ${source.url}
Source material: ${source.summary}

Requirements:
- Headline: maximum 12 words, commercially sharp, not clickbait.
- accentPhrase: an exact 1–4 word phrase at the end of the headline that should be orange.
- Subtext: one concise consequence, insight or outcome.
- actionLabel: short website-led CTA.
- Write separate Instagram and Facebook captions, each 100–200 words, naturally creating demand and ending with ${SURE_IMPORTS_URL}.
- Use WhatsApp only when a direct enquiry is relevant. If used, include exactly “WhatsApp only: ${SURE_IMPORTS_WHATSAPP}” in both captions.
- imagePrompt: a premium, photorealistic editorial scene supporting the idea, with no text or logos.
- demandRationale: explain the tension, desired outcome and bridge in 1–2 sentences.`,
  ) as SocialCopy;
  validateSocialCopy(copy);
  return copy;
}

export async function verifyDemandCreation(source: SocialSource, copy: SocialCopy) {
  const schema = {
    type: 'object', additionalProperties: false,
    properties: { accepted: { type: 'boolean' }, score: { type: 'integer', minimum: 1, maximum: 10 }, reason: { type: 'string' } },
    required: ['accepted', 'score', 'reason'],
  };
  const review = await structuredResponse(
    'sure_imports_demand_review', schema,
    'You are a strict demand-generation editor. Reject generic awareness content. A strong campaign reveals a costly unresolved problem or desired business outcome, gives the reader a useful new perspective, and makes the service a credible next step without hype.',
    `Source: ${source.title}\nHeadline: ${copy.headline}\nSubtext: ${copy.subtext}\nInstagram: ${copy.instagramCaption}\nFacebook: ${copy.facebookCaption}\nRationale: ${copy.demandRationale}`,
  ) as { accepted: boolean; score: number; reason: string };
  if (!review.accepted || review.score < 8) throw new Error(`Demand review rejected (${review.score}/10): ${review.reason}`);
  return review;
}

export async function generateSupportingImage(prompt: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Missing OPENAI_API_KEY in admin environment.');
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.SOCIAL_IMAGE_MODEL || 'gpt-image-2', prompt, size: '1024x1024', quality: 'high', output_format: 'png' }),
  });
  if (!response.ok) throw new Error(`Image generation failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  const payload = await response.json();
  const image = payload?.data?.[0]?.b64_json;
  if (!image) throw new Error('Image generation returned no image.');
  return Buffer.from(image, 'base64');
}
