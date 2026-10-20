import { ZodError } from 'zod';
import {
  conversationId,
  createSchema,
  messageSchema,
  statusSchema,
  messageCursor,
  SupportError,
  trustedSupportMutation,
} from './policy';
import type { SupportActor } from './policy';
import type { supportStore } from './store';
type Identity = { actor: SupportActor; country?: string | null };
type Resolver = (edit: boolean) => Promise<Identity | null>;
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

async function body(request: Request) {
  if (
    !(request.headers.get('content-type') || '').startsWith('application/json')
  )
    throw new SupportError(415, 'Use JSON to send a message.');
  const reader = request.body?.getReader();
  if (!reader) throw new SupportError(400, 'Missing message.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 24000) {
        await reader.cancel();
        throw new SupportError(413, 'Message is too large.');
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof SupportError) throw error;
    throw new SupportError(400, 'Invalid message.');
  } finally {
    reader.releaseLock();
  }
}
export function supportEndpoints(
  store: ReturnType<typeof supportStore>,
  resolve: Resolver,
) {
  async function run(
    request: Request,
    work: (identity: Identity) => Promise<unknown>,
  ) {
    try {
      if (process.env.SUPPORT_CHAT_ENABLED !== 'true')
        throw new SupportError(404, 'Support pilot is not available.');
      const edit = request.method !== 'GET';
      if (edit && !trustedSupportMutation(request))
        throw new SupportError(
          403,
          'Please send this request from the support page.',
        );
      const identity = await resolve(edit);
      if (!identity)
        throw new SupportError(
          403,
          'Sign in with an account that has access to support.',
        );
      return Response.json(await work(identity), { headers });
    } catch (error) {
      if (error instanceof SupportError)
        return Response.json(
          { error: error.message },
          { status: error.status, headers },
        );
      if (error instanceof ZodError)
        return Response.json(
          { error: 'Please check your message and try again.' },
          { status: 400, headers },
        );
      // Never include message text, cookies or customer records in logs/errors.
      console.error('Support request failed', {
        code: (error as { code?: string })?.code || 'UNKNOWN',
      });
      return Response.json(
        {
          error:
            'Support is temporarily unavailable. Please retry or use WhatsApp.',
        },
        { status: 503, headers },
      );
    }
  }
  return {
    list: (request: Request) =>
      run(request, async ({ actor }) => ({
        conversations: await store.list(actor),
      })),
    create: (request: Request) =>
      run(request, async ({ actor, country }) => ({
        id: await store.create(
          actor,
          createSchema.parse(await body(request)),
          country || null,
        ),
      })),
    history: (request: Request, id: string) =>
      run(request, ({ actor }) =>
        store.history(
          actor,
          conversationId.parse(id),
          messageCursor(new URL(request.url).searchParams.get('after')),
        ),
      ),
    send: (request: Request, id: string) =>
      run(request, async ({ actor }) => {
        await store.send(
          actor,
          conversationId.parse(id),
          messageSchema.parse(await body(request)),
        );
        return { ok: true };
      }),
    status: (request: Request, id: string) =>
      run(request, async ({ actor }) => {
        await store.setStatus(
          actor,
          conversationId.parse(id),
          statusSchema.parse(await body(request)).status,
        );
        return { ok: true };
      }),
    analytics: (request: Request) =>
      run(request, ({ actor }) => store.analytics(actor)),
  };
}
