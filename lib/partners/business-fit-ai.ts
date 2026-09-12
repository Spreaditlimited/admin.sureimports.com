import 'server-only';
import { automaticFitSchema, answerKeys, fitCriteria, fitRubric, readinessForAssessment } from './business-fit-policy';

const explanation = {
  type: 'object', additionalProperties: false,
  properties: { reason: { type: 'string' }, sources: { type: 'array', items: { type: 'string', enum: answerKeys } } },
  required: ['reason', 'sources'],
};
const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    scores: { type: 'object', additionalProperties: false, properties: Object.fromEntries(fitCriteria.map(([key]) => [key, { type: 'integer', minimum: 0, maximum: 5 }])), required: fitCriteria.map(([key]) => key) },
    explanations: { type: 'object', additionalProperties: false, properties: Object.fromEntries(fitCriteria.map(([key]) => [key, explanation])), required: fitCriteria.map(([key]) => key) },
    strengths: { type: 'array', items: { type: 'string' } },
    concerns: { type: 'array', items: { type: 'string' } },
    followUps: { type: 'array', items: { type: 'string' } },
  }, required: ['scores', 'explanations', 'strengths', 'concerns', 'followUps'],
};

export async function generateFitAssessment(answers: ReturnType<typeof readinessForAssessment>, model: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Automatic scoring is not configured. Admin can still review manually.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(45000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, store: false, max_output_tokens: 4500,
      input: [{ role: 'system', content: fitRubric }, { role: 'user', content: JSON.stringify(readinessForAssessment(answers)) }],
      text: { format: { type: 'json_schema', name: 'partner_business_fit', strict: true, schema } },
    }),
  });
  if (!response.ok) throw new Error('Automatic scoring is temporarily unavailable. Retry shortly or review manually.');
  const payload = await response.json() as { status?: string; output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> };
  if (payload.status !== 'completed') throw new Error('Automatic scoring did not finish. Retry shortly or review manually.');
  const content = payload.output?.filter(item => item.type === 'message').flatMap(item => item.content || []) || [];
  if (content.some(item => item.type === 'refusal')) throw new Error('Automatic scoring could not assess these answers. Please review manually.');
  const text = content.filter(item => item.type === 'output_text').map(item => item.text || '').join('');
  return automaticFitSchema.parse(JSON.parse(text));
}
