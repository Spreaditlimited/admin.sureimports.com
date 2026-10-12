// Run with the existing Brevo credential supplied privately via --env-file.
// This prepares account assets; it does not send emails or subscribe contacts.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { renderMarketingEmail } = require('../lib/marketing/content.ts');
const sequence = require('../lib/marketing/data/import-email-sequence-52-weeks.json');

const key = process.env.BREVO_API_KEY;
if (!key) throw new Error('BREVO_API_KEY is required.');
async function api(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`https://api.brevo.com/v3${path}`, {
    method, headers: { 'api-key': key!, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Brevo ${method} ${path}: ${response.status} ${result?.code}`);
  return result;
}
await api('/senders/domains/sureimports.com/authenticate', 'PUT');
const domain = await api('/senders/domains/sureimports.com');
if (!domain.authenticated) throw new Error('Domain authentication is not complete.');
const folders = await api('/contacts/folders?limit=50');
const folder = folders.folders.find((item: { name: string }) => item.name === 'Sure Imports') || await api('/contacts/folders', 'POST', { name: 'Sure Imports' });
const lists = await api(`/contacts/folders/${folder.id}/lists?limit=50`);
const list = (lists.lists || []).find((item: { name: string }) => item.name === 'Sure Imports Insights — Confirmed Subscribers') ||
  await api('/contacts/lists', 'POST', { name: 'Sure Imports Insights — Confirmed Subscribers', folderId: folder.id });
const senders = await api('/senders');
const sender = senders.senders.find((item: { email: string }) => item.email === 'insights@sureimports.com') ||
  await api('/senders', 'POST', { name: 'Sure Imports Insights', email: 'insights@sureimports.com' });
const attributes = await api('/contacts/attributes');
for (const attribute of ['SUREIMPORTS_FIRSTNAME', 'SUREIMPORTS_CONSENT_AT', 'SUREIMPORTS_CONSENT_SOURCE']) {
  if (!attributes.attributes.some((item: { name: string }) => item.name === attribute)) {
    await api(`/contacts/attributes/normal/${attribute}`, 'POST', { type: 'text' });
  }
}
const logoUrl = 'https://sureimports.com/images/logo.png';
const logo = await fetch(logoUrl);
if (!logo.ok || !logo.headers.get('content-type')?.startsWith('image/')) throw new Error('Approved logo is unavailable.');
const uploadedLogo = await api('/emailCampaigns/images', 'POST', { imageUrl: logoUrl, name: 'sure-imports-approved-logo.png' });
const welcome = sequence.steps[0];
const rendered = renderMarketingEmail({
  ...welcome, bodyTitle: welcome.title, firstName: '{{ params.FIRSTNAME }}',
  includeManagedUnsubscribe: true, unsubscribeUrl: '{{ params.UNSUBSCRIBE_URL }}',
});
const templateName = 'Sure Imports Insights — Approved Email Design';
const templates = await api('/smtp/templates?limit=100&offset=0');
let template = templates.templates?.find((item: { name: string }) => item.name === templateName);
const templateBody = { sender: { id: sender.id }, templateName, subject: welcome.subject, htmlContent: rendered.html, replyTo: 'insights@sureimports.com', tag: 'sureimports-marketing', isActive: true };
if (template) await api(`/smtp/templates/${template.id}`, 'PUT', templateBody);
else template = await api('/smtp/templates', 'POST', templateBody);
const report = { domainAuthenticated: domain.authenticated, folderId: folder.id, listId: list.id, senderId: sender.id, templateId: template.id, logoUrl, brevoLogoUrl: uploadedLogo.url, contactsImported: 0, design: 'Existing Sure Imports standard email template; orange CTA; Lagos and Guangzhou addresses; signed unsubscribe link.', checkedAt: new Date().toISOString() };
writeFileSync('/private/tmp/sureimports-brevo-setup.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
