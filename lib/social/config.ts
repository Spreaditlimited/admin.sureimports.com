export const SOCIAL_APPROVAL_EMAIL = process.env.SOCIAL_APPROVAL_EMAIL || 'hello@sureimports.com';
export const SOCIAL_SERVICE_KEY = 'social_studio';
export const SURE_IMPORTS_URL = 'https://www.sureimports.com';
export const SURE_IMPORTS_WHATSAPP = '+234 803 764 9956';
export const SURE_IMPORTS_INSTAGRAM = 'sureimport';
export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v25.0';

export function adminBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://admin.sureimports.com').replace(/\/$/, '');
}
