import { createHash } from 'node:crypto';

export function reportNotificationKey(reportSlug: string, email: string) {
  return createHash('sha256')
    .update(`${reportSlug}\n${email.trim().toLowerCase()}`)
    .digest('hex');
}

export function reportDemandMatches(
  query: string,
  slug: string,
  resultSlug?: string | null,
) {
  if (resultSlug && resultSlug === slug) return true;
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(
        /\b(suppliers?|manufacturers?|factories|factory|wholesale|china|chinese|reports?)\b/g,
        ' ',
      )
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  return Boolean(normalize(query)) && normalize(query) === normalize(slug);
}

export function reportReadyEmail(query: string, slug: string, email: string) {
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw new Error('Invalid report notification destination');
  }
  const safe = query.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
  return {
    xEmail: email.trim().toLowerCase(),
    xTitle: `${query.replace(/[\r\n]/g, ' ')} report is now available`,
    xBodyTitle: 'Your requested report is ready',
    xBody1: `You voted for <b>${safe}</b> on the Sure Imports Research Radar. The report has now passed review and is available.`,
    xBody2:
      'View the report details, manufacturer count and price before purchasing. Thank you for helping us choose what to research next.',
    xButtonTitle: 'View the report',
    xButtonLink: `https://www.sureimports.com/supplier-intelligence/reports/${slug}`,
    throwOnError: true,
  };
}
