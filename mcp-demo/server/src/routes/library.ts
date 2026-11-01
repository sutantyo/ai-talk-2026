import type { FastifyInstance } from 'fastify';
import { readSession, type ApiDeps } from './auth.js';
import type { LibraryStore } from '../store.js';
import type { ChangeHub } from '../events.js';
import type { ChannelService } from '../channels.js';
import { SESSION_COOKIE, type LibraryResponse } from '../../../shared/protocol.js';
import { signSession, sessionCookieOptions } from '../session.js';

export interface LibraryDeps {
  library: LibraryStore;
  changes: ChangeHub;
  channels: ChannelService;
  /** Set only for local testing; see config.ts. */
  devLoginEmail: string | null;
  /** Public; the page needs it to show Google's sign-in button. */
  googleClientId: string;
}

/**
 * What the page itself can do: read the library, mark a video watched or not,
 * and listen for changes. Organising (playlists, adding videos) is Claude's
 * job, through MCP.
 */
export function registerLibraryRoutes(app: FastifyInstance, api: ApiDeps, deps: LibraryDeps): void {
  app.get('/api/config', async () => ({
    googleClientId: deps.googleClientId,
    devLogin: deps.devLoginEmail !== null
  }));

  app.get('/api/library', async (request, reply) => {
    const userId = readSession(request, reply, api);
    if (userId === null) return reply.code(401).send({ error: 'signed_out' });
    // Channels not checked in 30 minutes are checked in the background; if new
    // uploads turn up, the change event makes the page fetch again.
    void deps.channels.refreshStale(userId).catch((error) => request.log.warn({ err: error }, 'channel check failed'));
    const response: LibraryResponse = {
      playlists: await deps.library.listPlaylists(userId),
      channels: await deps.channels.list(userId)
    };
    return reply.header('cache-control', 'no-store').send(response);
  });

  app.post('/api/videos/:id/watched', async (request, reply) => {
    const userId = readSession(request, reply, api);
    if (userId === null) return reply.code(401).send({ error: 'signed_out' });
    const { id } = request.params as { id: string };
    const body = request.body as { watched?: unknown } | undefined;
    if (typeof body?.watched !== 'boolean') return reply.code(400).send({ error: 'watched_must_be_boolean' });
    const video = await deps.library.setWatched(userId, id, body.watched);
    if (video === null) return reply.code(404).send({ error: 'not_found' });
    deps.changes.publish(userId, { highlight: [] });
    return reply.send(video);
  });

  /**
   * Server-sent events: one line per change, so every open page (the laptop on
   * stage, a phone) refetches as soon as Claude adds something. A comment line
   * every 25 s keeps proxies from closing an idle stream.
   */
  app.get('/api/events', async (request, reply) => {
    const userId = readSession(request, reply, api);
    if (userId === null) return reply.code(401).send({ error: 'signed_out' });

    reply.hijack();
    const out = reply.raw;
    out.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      'x-accel-buffering': 'no'
    });
    out.write('retry: 3000\n\n');
    const unsubscribe = deps.changes.subscribe(userId, (change) => {
      out.write(`event: change\ndata: ${JSON.stringify(change)}\n\n`);
    });
    const heartbeat = setInterval(() => out.write(': keep-alive\n\n'), 25_000);
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  if (deps.devLoginEmail !== null) {
    const email = deps.devLoginEmail;
    app.post('/api/auth/dev', async (_request, reply) => {
      const user = await api.store.upsertUser({ sub: `dev:${email}`, email, name: 'Local tester' });
      reply.setCookie(SESSION_COOKIE, signSession(user.id, api.now(), api.sessionSecret), sessionCookieOptions(api.secureCookies));
      return reply.send({ signedIn: true, userId: user.id, email: user.email, name: user.name });
    });
  }
}
