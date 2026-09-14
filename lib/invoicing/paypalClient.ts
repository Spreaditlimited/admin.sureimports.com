// This integration deliberately never falls back to the LineScout PayPal app.
export function invoicePayPalEnvironment(): 'sandbox' | 'live' {
  return (process.env.SUREIMPORTS_PAYPAL_ENV || (process.env.NODE_ENV === 'production' ? 'live' : 'sandbox')) === 'live' ? 'live' : 'sandbox';
}

export async function invoicePayPalRequest(path: string, body?: unknown, requestId?: string) {
  const sandbox = invoicePayPalEnvironment() === 'sandbox';
  const id = sandbox ? process.env.SUREIMPORTS_PAYPAL_SANDBOX_CLIENT_ID : process.env.SUREIMPORTS_PAYPAL_CLIENT_ID;
  const secret = sandbox ? process.env.SUREIMPORTS_PAYPAL_SANDBOX_SECRET : process.env.SUREIMPORTS_PAYPAL_SECRET;
  if (!id || !secret) throw new Error('Invoice card payments are not configured yet.');
  const base = sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  const auth = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Basic ${Buffer.from(`${id.trim()}:${secret.trim()}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const token = await auth.json().catch(() => null);
  if (!auth.ok || !token?.access_token) throw new Error('PayPal authentication is unavailable. Please try again shortly.');
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST', cache: 'no-store', signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json', ...(requestId ? { 'PayPal-Request-Id': requestId } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error('PayPal could not complete this request. Refresh to check the payment status before trying again.');
  return result;
}
