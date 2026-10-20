import { z } from 'zod';
// Only browser push-service hosts; subscription endpoints are never arbitrary fetch URLs.
export function trustedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname;
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      (host === 'fcm.googleapis.com' ||
        host === 'updates.push.services.mozilla.com' ||
        host.endsWith('.push.services.mozilla.com') ||
        host === 'web.push.apple.com' ||
        host.endsWith('.push.apple.com') ||
        host.endsWith('.notify.windows.com'))
    );
  } catch {
    return false;
  }
}
const endpoint = z.string().max(2048).refine(trustedPushEndpoint);
export const pushSubscriptionSchema = z
  .object({
    endpoint,
    expirationTime: z.number().nullable().optional(),
    keys: z
      .object({
        p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}={0,1}$/),
        auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
      })
      .strict(),
  })
  .strict();
export const pushActionSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('subscribe'),
      subscription: pushSubscriptionSchema,
    })
    .strict(),
  z.object({ action: z.literal('status'), endpoint }).strict(),
  z.object({ action: z.literal('unsubscribe'), endpoint }).strict(),
]);
