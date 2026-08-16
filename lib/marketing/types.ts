export type MarketingEmailInput = {
  recipientEmail: string;
  firstName?: string | null;
  subject: string;
  bodyTitle?: string | null;
  previewText?: string | null;
  bodyText: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  topicName?: string;
  tags?: Record<string, string>;
  unsubscribeUrl?: string | null;
};

export type MarketingSendResult = {
  messageId: string;
  recipientEmail: string;
  provider: 'hostinger' | 'ses';
  mode: 'production' | 'sandbox';
};
