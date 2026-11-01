import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './app.js';
import { createPgliteDb, migrate, type Db } from './db.js';
import { createLibraryStore, createUserStore } from './store.js';
import { createPostgresOAuthStore } from './oauth/store.js';
import { ChangeHub, type LibraryChange } from './events.js';
import { VideoLookupError, type LookupVideo } from './youtube.js';
import { ChannelService } from './channels.js';
import type { LookupFacebookReel } from './facebook.js';
import type { ChannelSource } from './youtubeChannels.js';
import type { LibraryResponse } from '../../shared/protocol.js';

/**
 * The whole chain Claude goes through, against a real (in-memory) Postgres:
 * register as a client, sign in, approve, swap the code for a token, then use
 * the MCP tools, and see the page's own API show the result.
 */

const BASE = 'http://localhost:8080';
const REDIRECT = 'http://localhost:4567/callback';

/** Ids starting with "Short" are Shorts. */
const lookupVideo: LookupVideo = async (youtubeId) => {
  if (youtubeId === 'NoEmbed0000') throw new VideoLookupError('cannot be played outside YouTube');
  const isShort = youtubeId.startsWith('Short');
  return { youtubeId, source: 'youtube', title: `Title of ${youtubeId}`, channel: 'Some channel', isShort, thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/x.jpg` };
};

const lookupFacebookReel: LookupFacebookReel = async (reel, title) => ({
  youtubeId: reel.reelId,
  source: 'facebook',
  title: title ?? 'Reel by Someone',
  channel: 'Someone',
  thumbnailUrl: 'data:image/jpeg;base64,AAAA',
  isShort: true
});

let db: Db;
let app: FastifyInstance;
const changes = new ChangeHub();
const seen: LibraryChange[] = [];
let cookie = '';
let accessToken = '';

function setCookieValue(header: string | string[] | undefined): string {
  const first = Array.isArray(header) ? header[0] : header;
  return (first ?? '').split(';')[0];
}

async function mcp(method: string, params: Record<string, unknown> = {}, token = accessToken) {
  const response = await app.inject({
    method: 'POST',
    url: '/mcp',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'mcp-protocol-version': '2025-06-18' },
    payload: { jsonrpc: '2.0', id: 1, method, params }
  });
  return response;
}

async function callTool(name: string, args: Record<string, unknown>) {
  const response = await mcp('tools/call', { name, arguments: args });
  expect(response.statusCode).toBe(200);
  return response.json().result as { content: Array<{ text: string }>; isError?: boolean };
}

beforeAll(async () => {
  db = await createPgliteDb(null);
  await migrate(db);
  await migrate(db); // twice: the schema must be safe to run on every boot
  const library = createLibraryStore(db);
  const channelSource: ChannelSource = {
    resolve: async () => ({
      channelId: 'UCOKHwx1VCdgnxwbjyb9Iu1g',
      kind: 'channel',
      owner: '',
      title: 'Blender Guru',
      avatarUrl: '',
      url: 'https://www.youtube.com/channel/UCOKHwx1VCdgnxwbjyb9Iu1g'
    }),
    feed: async () => [
      { youtubeId: 'ccccccccccc', title: 'Older', publishedAt: '2026-10-01T00:00:00.000Z', isShort: false },
      { youtubeId: 'bbbbbbbbbbb', title: 'Newer', publishedAt: '2026-11-01T00:00:00.000Z', isShort: false }
    ]
  };
  const channels = new ChannelService(db, channelSource, changes);
  const api = {
    store: createUserStore(db),
    verifyGoogleIdToken: async () => {
      throw new Error('not used');
    },
    sessionSecret: 's'.repeat(40),
    secureCookies: false,
    allowedEmails: null,
    now: () => Date.now()
  };
  app = buildServer({
    clientDir: null,
    api,
    library: { library, changes, channels, devLoginEmail: 'owner@test.invalid', googleClientId: '' },
    mcp: { library, lookupVideo, lookupFacebookReel, changes, channels, channelSource, publicBaseUrl: BASE },
    oauth: { store: createPostgresOAuthStore(db), publicBaseUrl: BASE, googleClientId: '' }
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await db.end();
});

describe('connecting Claude', () => {
  it('answers an unauthenticated MCP call with the 401 that starts discovery', async () => {
    const response = await mcp('initialize', {}, 'nonsense');
    expect(response.statusCode).toBe(401);
    expect(response.headers['www-authenticate']).toContain('/.well-known/oauth-protected-resource');
  });

  it('registers, signs in, approves and gets a token', async () => {
    const registered = await app.inject({
      method: 'POST',
      url: '/oauth/register',
      payload: { client_name: 'Claude', redirect_uris: [REDIRECT] }
    });
    expect(registered.statusCode).toBe(201);
    const clientId = registered.json().client_id as string;

    const signedIn = await app.inject({ method: 'POST', url: '/api/auth/dev' });
    expect(signedIn.statusCode).toBe(200);
    cookie = setCookieValue(signedIn.headers['set-cookie']);

    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const authorizeParams = {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: REDIRECT,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: 'xyz',
      resource: `${BASE}/mcp`
    };

    const consent = await app.inject({
      method: 'GET',
      url: `/oauth/authorize?${new URLSearchParams(authorizeParams)}`,
      headers: { cookie }
    });
    expect(consent.statusCode).toBe(200);
    expect(consent.body).toContain('Create playlists and add videos');

    const approved = await app.inject({
      method: 'POST',
      url: '/oauth/authorize',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded', origin: BASE },
      payload: new URLSearchParams({ ...authorizeParams, scope: 'library.read library.write', decision: 'allow' }).toString()
    });
    expect(approved.statusCode).toBe(302);
    const location = new URL(approved.headers.location as string);
    expect(location.searchParams.get('state')).toBe('xyz');
    const code = location.searchParams.get('code')!;

    const token = await app.inject({
      method: 'POST',
      url: '/oauth/token',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        client_id: clientId,
        redirect_uri: REDIRECT,
        resource: `${BASE}/mcp`
      }).toString()
    });
    expect(token.statusCode).toBe(200);
    accessToken = token.json().access_token;
    expect(accessToken).toBeTruthy();
  });

  it('lists exactly five tools, none of which deletes', async () => {
    const init = await mcp('initialize', { protocolVersion: '2025-06-18' });
    expect(init.json().result.instructions).toContain('four pages');
    const list = await mcp('tools/list');
    const names = list.json().result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual(['list_playlists', 'create_playlist', 'add_videos', 'follow_channel', 'list_channels']);
  });
});

describe('organising through the tools', () => {
  it('creates playlists on both pages, refusing a duplicate name', async () => {
    const unsubscribe = changes.subscribe((await userId()), (c) => seen.push(c));
    expect((await callTool('create_playlist', { page: 'watch', name: 'Blender' })).isError).toBeFalsy();
    expect((await callTool('create_playlist', { page: 'saved', name: 'Blender' })).isError).toBeFalsy();
    const dup = await callTool('create_playlist', { page: 'watch', name: 'blender' });
    expect(dup.isError).toBe(true);
    expect(dup.content[0].text).toContain('already a playlist');
    expect(seen).toHaveLength(2);
    unsubscribe();
  });

  it('needs a page when the name is on both', async () => {
    const result = await callTool('add_videos', { playlist: 'Blender', videos: ['dQw4w9WgXcQ'] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('more than one page');
  });

  it('adds videos, skipping bad links, refused videos and repeats', async () => {
    const result = await callTool('add_videos', {
      playlist: 'Blender',
      page: 'watch',
      videos: [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/aaaaaaaaaaa',
        'https://vimeo.com/1',
        'NoEmbed0000',
        'dQw4w9WgXcQ'
      ]
    });
    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain('Added 2 of 5');
    expect(text).toContain('not a YouTube video or Facebook reel link');
    expect(text).toContain('cannot be played outside YouTube');
    expect(text).toContain('already in this playlist');
  });

  it('keeps Shorts on the Shorts page only', async () => {
    expect((await callTool('create_playlist', { page: 'shorts', name: 'Funny' })).isError).toBeFalsy();
    const wrongWay = await callTool('add_videos', { playlist: 'Blender', page: 'watch', videos: ['Short000001'] });
    expect(wrongWay.isError).toBe(true);
    expect(wrongWay.content[0].text).toContain('Shorts go only in a playlist on the Shorts page');
    const otherWay = await callTool('add_videos', { playlist: 'Funny', videos: ['ddddddddddd'] });
    expect(otherWay.content[0].text).toContain('not a Short');
    const right = await callTool('add_videos', { playlist: 'Funny', videos: ['Short000001', 'ddddddddddd'] });
    expect(right.content[0].text).toContain('Added 1 of 2');
    const library = (await app.inject({ method: 'GET', url: '/api/library', headers: { cookie } })).json() as LibraryResponse;
    for (const playlist of library.playlists) {
      expect(playlist.videos.every((v) => v.isShort === (playlist.page === 'shorts'))).toBe(true);
    }
  });

  it('adds a Facebook reel to Shorts only, with the title it was given', async () => {
    const wrong = await callTool('add_videos', { playlist: 'Blender', page: 'watch', videos: ['https://www.facebook.com/reel/1804615860166129'] });
    expect(wrong.content[0].text).toContain('Facebook reel, which counts as a Short');
    const right = await callTool('add_videos', {
      playlist: 'Funny',
      videos: [{ link: 'https://www.facebook.com/reel/1804615860166129', title: 'Wombat in the hay' }]
    });
    expect(right.content[0].text).toContain('✓ "Wombat in the hay" (Someone)');
    const library = (await app.inject({ method: 'GET', url: '/api/library', headers: { cookie } })).json() as LibraryResponse;
    const reel = library.playlists.find((p) => p.name === 'Funny')!.videos.find((v) => v.source === 'facebook')!;
    expect(reel).toMatchObject({ youtubeId: '1804615860166129', isShort: true, title: 'Wombat in the hay' });
  });

  it('shows the result on the page API, and lets the page mark a video watched', async () => {
    const library = (await app.inject({ method: 'GET', url: '/api/library', headers: { cookie } })).json() as LibraryResponse;
    const watch = library.playlists.find((p) => p.page === 'watch' && p.name === 'Blender')!;
    expect(watch.videos.map((v) => v.youtubeId).sort()).toEqual(['aaaaaaaaaaa', 'dQw4w9WgXcQ']);

    const marked = await app.inject({
      method: 'POST',
      url: `/api/videos/${watch.videos[0].id}/watched`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: { watched: true }
    });
    expect(marked.statusCode).toBe(200);
    expect(marked.json().watchedAt).not.toBeNull();

    const listed = await callTool('list_playlists', { page: 'watch' });
    expect(listed.content[0].text).toContain('[watched]');
  });

  it('follows a channel and shows its uploads newest first', async () => {
    const followed = await callTool('follow_channel', { channel: '@blenderguru' });
    expect(followed.isError).toBeFalsy();
    expect(followed.content[0].text).toContain('Now following Blender Guru (2 recent uploads)');
    expect((await callTool('follow_channel', { channel: '@blenderguru' })).content[0].text).toContain('Already following');
    expect((await callTool('follow_channel', { channel: 'https://vimeo.com/1' })).isError).toBe(true);

    const library = (await app.inject({ method: 'GET', url: '/api/library', headers: { cookie } })).json() as LibraryResponse;
    expect(library.channels).toHaveLength(1);
    expect(library.channels[0].uploads.map((u) => u.title)).toEqual(['Newer', 'Older']);

    const listed = await callTool('list_channels', {});
    expect(listed.content[0].text).toMatch(/Blender Guru[\s\S]*Newer[\s\S]*Older/);
  });

  it('keeps the page API closed without a session', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/library' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/events' })).statusCode).toBe(401);
  });
});

async function userId(): Promise<string> {
  const session = await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } });
  return session.json().userId;
}
