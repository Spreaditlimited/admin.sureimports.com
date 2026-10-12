import { prisma } from '@/lib/prisma';
import { brevoRequest, getBrevoConfig, getBrevoContact, isBrevoContactBlocked, type BrevoContact } from './brevoClient';
import { hasConfirmedMarketingConsent } from './brevoConsent';

export async function removeBrevoMarketingContact(email: string) {
  const remote = await getBrevoContact(email);
  const { listId } = getBrevoConfig();
  if (remote?.listIds?.includes(listId)) {
    // List-specific removal preserves the contact's subscriptions to other brands.
    await brevoRequest(`/contacts/lists/${listId}/contacts/remove`, 'POST', { emails: [email] });
  }
}

export async function syncBrevoMarketingContact(email: string) {
  const contact = await prisma.marketing_contacts.findUnique({ where: { email } });
  if (!contact || !hasConfirmedMarketingConsent(contact)) {
    await removeBrevoMarketingContact(email);
    return false;
  }
  const remote = await getBrevoContact(email);
  if (remote && isBrevoContactBlocked(remote)) {
    await removeBrevoMarketingContact(email);
    return false;
  }
  const { listId } = getBrevoConfig();
  const attributes = {
    SUREIMPORTS_FIRSTNAME: contact.firstName || '',
    SUREIMPORTS_CONSENT_AT: contact.consentAt!.toISOString(),
    SUREIMPORTS_CONSENT_SOURCE: contact.consentSource || 'confirmed-opt-in',
  };
  if (!remote?.listIds?.includes(listId) || Object.entries(attributes).some(([key, value]) => remote.attributes?.[key] !== value)) {
    await brevoRequest('/contacts', 'POST', { email, listIds: [listId], attributes, updateEnabled: true });
  }
  // A withdrawal may race a remote request. Recheck before reporting success.
  const latest = await prisma.marketing_contacts.findUnique({ where: { email } });
  if (!hasConfirmedMarketingConsent(latest)) {
    await removeBrevoMarketingContact(email);
    return false;
  }
  return true;
}

export async function reconcileBrevoMarketingContacts() {
  const { listId } = getBrevoConfig();
  const remoteContacts: BrevoContact[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await brevoRequest<{ contacts?: BrevoContact[] }>(`/contacts/lists/${listId}/contacts?limit=500&offset=${offset}`);
    remoteContacts.push(...(page.contacts || []));
    if ((page.contacts?.length || 0) < 500) break;
  }
  const eligible = await prisma.marketing_contacts.findMany({
    where: { status: 'ACTIVE', consentStatus: 'OPTED_IN', consentAt: { not: null }, unsubscribedAt: null, bouncedAt: null, complainedAt: null },
    select: { email: true },
  });
  const eligibleEmails = new Set(eligible.map(({ email }) => email));
  let removed = 0;
  let synced = 0;
  let failed = 0;
  // Remove withdrawn/unconfirmed contacts before any additions. Never import all users.
  for (const remote of remoteContacts) {
    if (!eligibleEmails.has(remote.email.toLowerCase()) || isBrevoContactBlocked(remote)) {
      await removeBrevoMarketingContact(remote.email);
      removed++;
    }
  }
  // Bound concurrency without an external queue; failures are retried by the next cron run.
  for (let start = 0; start < eligible.length; start += 5) {
    const results = await Promise.allSettled(eligible.slice(start, start + 5).map(({ email }) => syncBrevoMarketingContact(email)));
    for (const result of results) {
      if (result.status === 'rejected') failed++;
      else if (result.value) synced++;
    }
  }
  return { eligible: eligible.length, synced, removed, failed };
}
