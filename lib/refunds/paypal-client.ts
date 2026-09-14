import 'server-only';

type App = 'sureimports' | 'legacy';
const base = 'https://api-m.paypal.com';
function credentials(app: App) {
  if (app === 'legacy' && process.env.PAYPAL_ENV?.trim().toLowerCase() === 'sandbox') return null;
  const id = app === 'sureimports' ? process.env.SUREIMPORTS_PAYPAL_CLIENT_ID : process.env.PAYPAL_CLIENT_ID;
  const secret = app === 'sureimports' ? process.env.SUREIMPORTS_PAYPAL_SECRET : process.env.PAYPAL_CLIENT_SECRET;
  return id && secret ? Buffer.from(id + ':' + secret).toString('base64') : null;
}
async function token(app: App) {
  const auth = credentials(app);
  if (!auth) throw new Error('PayPal refund credentials are not configured.');
  const response = await fetch(base + '/v1/oauth2/token', {
    method: 'POST', headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials', signal: AbortSignal.timeout(15000), cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) throw new Error('PayPal refund authentication failed.');
  return String(result.access_token);
}
function resourceUrl(path: string) {
  return base + '/v2/' + (path.startsWith('/orders/') ? 'checkout' : 'payments') + path;
}
async function findResource(path: string) {
  for (const app of ['sureimports', 'legacy'] as const) {
    if (!credentials(app)) continue;
    const access = await token(app);
    const response = await fetch(resourceUrl(path), { headers: { Authorization: 'Bearer ' + access }, signal: AbortSignal.timeout(20000), cache: 'no-store' });
    // Only explicit not-found permits checking the historical app.
    if (response.status === 404) continue;
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id) throw new Error('PayPal has not confirmed this refund. Check its status before retrying.');
    return { access, data };
  }
  throw new Error('The original PayPal payment or refund could not be found. Review its payment reference.');
}
/** Live settlement only. Historical captures use the app that owns them. */
export async function paypalRefundRequest(path: string, body?: Record<string, unknown>, requestId?: string) {
  if (!/^\/(captures|refunds|orders)\/[A-Za-z0-9]+(\/refund)?$/.test(path)) throw new Error('Invalid PayPal resource.');
  if (!body) return (await findResource(path)).data;
  if (!/^\/captures\/[A-Za-z0-9]+\/refund$/.test(path) || !requestId) throw new Error('A capture and immutable refund request reference are required.');
  const capturePath = path.slice(0, -7);
  const owner = await findResource(capturePath);
  if (owner.data.id !== capturePath.split('/')[2]) throw new Error('The original payment could not be verified.');
  const response = await fetch(resourceUrl(path), {
    method: 'POST', headers: { Authorization: 'Bearer ' + owner.access, 'Content-Type': 'application/json', Prefer: 'return=representation', 'PayPal-Request-Id': requestId },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000), cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  // Never retry POST with another app after an uncertain outcome.
  if (!response.ok) throw new Error('PayPal has not confirmed this refund. Check its status before retrying.');
  return data;
}
