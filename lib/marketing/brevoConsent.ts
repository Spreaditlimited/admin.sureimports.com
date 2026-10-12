export type MarketingConsent = {
  status: string;
  consentStatus: string;
  consentAt: Date | string | null;
  unsubscribedAt?: Date | string | null;
  bouncedAt?: Date | string | null;
  complainedAt?: Date | string | null;
};

export function hasConfirmedMarketingConsent(contact: MarketingConsent | null) {
  return Boolean(contact && contact.status === 'ACTIVE' && contact.consentStatus === 'OPTED_IN' &&
    contact.consentAt && !contact.unsubscribedAt && !contact.bouncedAt && !contact.complainedAt);
}
