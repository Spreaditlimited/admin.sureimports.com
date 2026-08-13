import type { QuoteProduct } from './types';

export type ExtractionFile = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

export type QuotationExtraction = {
  title: string;
  introduction: string;
  internalSupplierName: string | null;
  products: QuoteProduct[];
  extractionNotes: string[];
};

const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };
const extractionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    introduction: { type: 'string' },
    internalSupplierName: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    products: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          unitPrice: { type: 'number' },
          currency: { type: 'string', enum: ['RMB', 'USD', 'NGN'] },
          quantity: { type: 'number' },
          unitWeightKg: nullableNumber,
          totalWeightKg: nullableNumber,
          unitsPerCarton: nullableNumber,
          cartonLengthCm: nullableNumber,
          cartonWidthCm: nullableNumber,
          cartonHeightCm: nullableNumber,
          totalCbm: nullableNumber,
          domesticTransportCost: { type: 'number' },
          domesticTransportCurrency: { type: 'string', enum: ['RMB', 'USD', 'NGN'] },
          notes: { type: 'string' },
          imageSourceIndex: nullableNumber,
        },
        required: [
          'id', 'name', 'description', 'unitPrice', 'currency', 'quantity',
          'unitWeightKg', 'totalWeightKg', 'unitsPerCarton', 'cartonLengthCm',
          'cartonWidthCm', 'cartonHeightCm', 'totalCbm', 'domesticTransportCost',
          'domesticTransportCurrency', 'notes', 'imageSourceIndex',
        ],
      },
    },
    extractionNotes: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'introduction', 'internalSupplierName', 'products', 'extractionNotes'],
};

function outputText(payload: any) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  return payload?.output
    ?.flatMap((item: any) => item?.content || [])
    .map((item: any) => item?.text)
    .filter((item: unknown) => typeof item === 'string')
    .join('');
}

export async function extractQuotationFiles(files: ExtractionFile[]): Promise<QuotationExtraction> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Missing OPENAI_API_KEY in the admin environment.');
  if (!files.length) throw new Error('Upload at least one image or PDF.');

  const fileList = files.map((file, index) => `${index}: ${file.name} (${file.mimeType})`).join('\n');
  const content: any[] = [
    {
      type: 'input_text',
      text: `Extract a customer-ready product quotation draft from the attached source files.\n\nSource indexes:\n${fileList}\n\nRules:\n- Read every page and image carefully.\n- Preserve distinct product configurations as separate products.\n- Correct spelling, grammar and awkward supplier wording while preserving technical meaning.\n- Convert weights to kilograms and carton dimensions to centimetres.\n- Use RMB for Chinese yuan prices.\n- Never invent a missing commercial value: return null for missing measurements and 0 for a missing price or domestic transport cost.\n- imageSourceIndex must point to the uploaded image that best represents the product; use null when the visual exists only inside a PDF or no suitable image was uploaded.\n- Supplier identities are internal only and must not appear in title, introduction, product descriptions or notes.\n- Write a concise professional title and introduction suitable for a Sure Imports customer quotation.\n- Put uncertainties that require human review in extractionNotes.`,
    },
    {
      type: 'input_text',
      text: 'Permanent customer-quotation rule: do not add recommendations for physical vehicle, product, supplier or factory verification.',
    },
  ];

  files.forEach((file) => {
    const data = `data:${file.mimeType};base64,${file.buffer.toString('base64')}`;
    if (file.mimeType === 'application/pdf') {
      content.push({ type: 'input_file', filename: file.name, file_data: data });
    } else {
      content.push({ type: 'input_image', image_url: data, detail: 'original' });
    }
  });

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.QUOTATION_EXTRACTION_MODEL || 'gpt-5.6-sol',
      reasoning: { effort: 'high' },
      input: [{ role: 'system', content: 'You are a meticulous Sure Imports commercial quotation analyst. Accuracy is more important than speed. Return only the requested structured output.' }, { role: 'user', content }],
      text: {
        verbosity: 'medium',
        format: {
          type: 'json_schema',
          name: 'sure_imports_quotation_extraction',
          strict: true,
          schema: extractionSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI quotation extraction failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  }
  const text = outputText(await response.json());
  if (!text) throw new Error('OpenAI returned no quotation extraction.');
  const parsed = JSON.parse(text) as QuotationExtraction;
  parsed.products = parsed.products.map((product, index) => ({
    ...product,
    id: String(product.id || `product-${index + 1}`),
    imageSourceIndex: Number.isInteger(product.imageSourceIndex) ? product.imageSourceIndex : null,
  }));
  return parsed;
}
