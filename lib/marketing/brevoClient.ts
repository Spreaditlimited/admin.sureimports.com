export class BrevoError extends Error {
  constructor(public status: number, public code: string) {
    super(`Brevo request failed (${status}, ${code}).`);
  }
}

export function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const listId = Number(process.env.BREVO_MARKETING_LIST_ID);
  if (!apiKey || !Number.isSafeInteger(listId) || listId <= 0) {
    throw new Error('Brevo marketing API key and list ID must be configured.');
  }
  return {
    apiKey, listId,
    email: process.env.BREVO_MARKETING_FROM_EMAIL?.trim() || 'insights@sureimports.com',
    name: process.env.MARKETING_FROM_NAME?.trim() || 'Sure Imports Insights',
    replyTo: process.env.MARKETING_REPLY_TO?.trim() || 'insights@sureimports.com',
  };
}

export async function brevoRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const { apiKey } = getBrevoConfig();
  const response = await fetch(`https://api.brevo.com/v3${path}`, {
    method,
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new BrevoError(response.status, String(result?.code || 'unknown'));
  return result as T;
}

export type BrevoContact = {
  email: string;
  emailBlacklisted?: boolean;
  smtpBlacklistSender?: string[];
  listIds?: number[];
  attributes?: Record<string, unknown>;
};

export async function getBrevoContact(email: string) {
  try {
    return await brevoRequest<BrevoContact>(`/contacts/${encodeURIComponent(email)}`);
  } catch (error) {
    if (error instanceof BrevoError && error.status === 404) return null;
    throw error;
  }
}

export function isBrevoContactBlocked(contact: BrevoContact) {
  return contact.emailBlacklisted === true ||
    Boolean(contact.smtpBlacklistSender?.some((sender) => sender.toLowerCase() === getBrevoConfig().email.toLowerCase()));
}

export async function verifyBrevoMarketing() {
  const config = getBrevoConfig();
  const [senders, list, domain] = await Promise.all([
    brevoRequest<{ senders: Array<{ email: string; active: boolean }> }>('/senders'),
    brevoRequest<{ id: number; name: string }>(`/contacts/lists/${config.listId}`),
    brevoRequest<{ authenticated: boolean; verified?: boolean }>('/senders/domains/sureimports.com'),
  ]);
  if (!senders.senders.some((sender) => sender.active && sender.email.toLowerCase() === config.email.toLowerCase())) {
    throw new Error('The Sure Imports Brevo sender is not verified.');
  }
  if (!domain.authenticated) throw new Error('The Sure Imports domain is not authenticated in Brevo.');
  if (!list.name.startsWith('Sure Imports')) throw new Error('The configured Brevo list does not belong to Sure Imports.');
  return { sender: config.email, listId: list.id, domainAuthenticated: true };
}
