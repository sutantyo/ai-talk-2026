import { parseYouTubeId } from './youtube.js';

/**
 * Channels and playlists without an API key (checked 2026-11-02):
 * - A channel's own page (`youtube.com/@handle` or `/channel/UC…`) carries its id
 *   in `<link rel="canonical">`, its name in `og:title` and its avatar in `og:image`.
 *   Asked once, when a channel is followed.
 * - Its RSS feed (`/feeds/videos.xml?channel_id=UC…`) lists the latest 15 uploads
 *   with upload times. Asked at most every 30 minutes per channel.
 * - A playlist (a series, like ABC's "If You're Listening") has the same feed at
 *   `/feeds/videos.xml?playlist_id=…`, whose head names the playlist and its owner.
 *   The feed holds the playlist's first 15 entries in the playlist's own order, so a
 *   series kept oldest-first would show its oldest 15 (checked once 2026-11-02 on a
 *   newest-first series: 14 entries, newest first).
 */

export const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
/** Playlist ids: PL… for ordinary playlists, plus OLAK5uy_…, UU…, FL… and the like. */
export const PLAYLIST_ID = /^(PL|OLAK5uy_|UU|FL|LL|RD)[A-Za-z0-9_-]{10,64}$/;

export interface ChannelInfo {
  /** A channel's `UC…` id, or a playlist's id. */
  channelId: string;
  kind: 'channel' | 'playlist';
  title: string;
  /** For a playlist, the channel that made it; empty for a channel. */
  owner: string;
  avatarUrl: string;
  url: string;
}

export interface FeedUpload {
  youtubeId: string;
  title: string;
  publishedAt: string;
  /** The feed links a Short to `/shorts/<id>` and anything else to `/watch?v=<id>` (checked 2026-11-02). */
  isShort: boolean;
}

export class ChannelLookupError extends Error {}

const BROWSER_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'accept-language': 'en'
};

export type ChannelRef =
  | { kind: 'page'; url: string }
  | { kind: 'video'; youtubeId: string }
  | { kind: 'playlist'; playlistId: string };

/**
 * What a person might paste for a channel: `@handle`, a channel link (`/@handle`,
 * `/channel/UC…`, `/c/name`, `/user/name`), a bare `UC…` id, or a link to one of
 * its videos.
 */
export function parseChannelRef(input: string): ChannelRef | null {
  const text = input.trim();
  if (CHANNEL_ID.test(text)) return { kind: 'page', url: `https://www.youtube.com/channel/${text}` };
  if (/^@[A-Za-z0-9._-]{3,30}$/.test(text)) return { kind: 'page', url: `https://www.youtube.com/${text}` };
  if (PLAYLIST_ID.test(text)) return { kind: 'playlist', playlistId: text };

  let url: URL;
  try {
    url = new URL(text.includes('://') ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, '');
  if (host === 'youtube.com' && url.pathname === '/playlist') {
    const list = url.searchParams.get('list');
    return list !== null && PLAYLIST_ID.test(list) ? { kind: 'playlist', playlistId: list } : null;
  }
  if (host === 'youtube.com') {
    const handle = url.pathname.match(/^\/(@[A-Za-z0-9._-]{3,30})(\/|$)/);
    if (handle) return { kind: 'page', url: `https://www.youtube.com/${handle[1]}` };
    const id = url.pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})(\/|$)/);
    if (id) return { kind: 'page', url: `https://www.youtube.com/channel/${id[1]}` };
    const legacy = url.pathname.match(/^\/(c|user)\/([A-Za-z0-9._-]+)(\/|$)/);
    if (legacy) return { kind: 'page', url: `https://www.youtube.com/${legacy[1]}/${legacy[2]}` };
  }
  const youtubeId = parseYouTubeId(text);
  return youtubeId === null ? null : { kind: 'video', youtubeId };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Reads id, name and avatar out of a channel page's HTML. */
export function parseChannelPage(html: string): ChannelInfo | null {
  const canonical = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/);
  const title = html.match(/<meta property="og:title" content="([^"]*)"/);
  if (!canonical || !title) return null;
  const image = html.match(/<meta property="og:image" content="([^"]*)"/);
  return {
    channelId: canonical[1],
    kind: 'channel',
    owner: '',
    title: decodeEntities(title[1]),
    // The page offers a 900 px avatar; rows show it at 32 px, so ask for 88 px.
    avatarUrl: image ? decodeEntities(image[1]).replace(/=s\d+-/, '=s88-') : '',
    url: `https://www.youtube.com/channel/${canonical[1]}`
  };
}

/** The head of a playlist feed: its title and the channel that made it. */
export function parsePlaylistFeedHead(xml: string): { title: string; owner: string; ownerUrl: string } | null {
  const head = xml.split('<entry>')[0];
  const title = head.match(/<title>([^<]*)<\/title>/);
  if (!title) return null;
  const author = head.match(/<author>\s*<name>([^<]*)<\/name>\s*<uri>([^<]*)<\/uri>/);
  return {
    title: decodeEntities(title[1]),
    owner: author ? decodeEntities(author[1]) : '',
    ownerUrl: author ? author[2] : ''
  };
}

/** The `<entry>` elements of a channel feed, newest first. The feed's own `<published>` (the channel's) is skipped. */
export function parseFeed(xml: string): FeedUpload[] {
  const uploads: FeedUpload[] = [];
  for (const entry of xml.split('<entry>').slice(1)) {
    const id = entry.match(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/);
    const title = entry.match(/<title>([^<]*)<\/title>/);
    const published = entry.match(/<published>([^<]+)<\/published>/);
    if (!id || !published || Number.isNaN(Date.parse(published[1]))) continue;
    uploads.push({
      youtubeId: id[1],
      title: title ? decodeEntities(title[1]) : 'Untitled video',
      publishedAt: new Date(published[1]).toISOString(),
      isShort: entry.includes(`href="https://www.youtube.com/shorts/${id[1]}"`)
    });
  }
  return uploads.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export interface ChannelSource {
  resolve(ref: ChannelRef): Promise<ChannelInfo>;
  feed(channelId: string): Promise<FeedUpload[]>;
}

export function createYouTubeChannelSource(fetchImpl: typeof fetch = fetch): ChannelSource {
  async function get(url: string, headers: Record<string, string> = {}): Promise<Response> {
    try {
      return await fetchImpl(url, { headers, signal: AbortSignal.timeout(8000) });
    } catch {
      throw new ChannelLookupError('YouTube did not answer in time. Try again in a moment.');
    }
  }

  async function pageUrlForVideo(youtubeId: string): Promise<string> {
    const watch = `https://www.youtube.com/watch?v=${youtubeId}`;
    const response = await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`);
    if (!response.ok) throw new ChannelLookupError(`Could not find the channel of video ${youtubeId}.`);
    const body = (await response.json()) as { author_url?: unknown };
    if (typeof body.author_url !== 'string' || !body.author_url.startsWith('https://www.youtube.com/')) {
      throw new ChannelLookupError(`Could not find the channel of video ${youtubeId}.`);
    }
    return body.author_url;
  }

  /**
   * The avatar, downloaded once and kept as a `data:` URL. YouTube's avatar host
   * (yt3.googleusercontent.com) sometimes answers a page's image request with a
   * 429 error page, which the browser then blocks (checked 2026-11-02), so the
   * page must not depend on it. Empty when it fails: the page shows an initial.
   */
  async function inlineAvatar(avatarUrl: string): Promise<string> {
    if (avatarUrl === '') return '';
    try {
      const response = await fetchImpl(avatarUrl, { signal: AbortSignal.timeout(5000) });
      const type = response.headers.get('content-type') ?? '';
      if (!response.ok || !type.startsWith('image/')) return '';
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 64 * 1024) return '';
      return `data:${type.split(';')[0]};base64,${bytes.toString('base64')}`;
    } catch {
      return '';
    }
  }

  async function feedUrl(id: string): Promise<string> {
    return CHANNEL_ID.test(id)
      ? `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`
      : `https://www.youtube.com/feeds/videos.xml?playlist_id=${id}`;
  }

  async function resolvePlaylist(playlistId: string): Promise<ChannelInfo> {
    const response = await get(await feedUrl(playlistId));
    if (response.status === 404) throw new ChannelLookupError(`YouTube has no public playlist ${playlistId}.`);
    if (!response.ok) throw new ChannelLookupError(`YouTube answered ${response.status} for playlist ${playlistId}.`);
    const head = parsePlaylistFeedHead(await response.text());
    if (head === null) throw new ChannelLookupError(`Could not read playlist ${playlistId}.`);
    // The owner's avatar, if their channel page answers; a playlist works without it.
    let avatarUrl = '';
    if (head.ownerUrl.startsWith('https://www.youtube.com/channel/')) {
      try {
        const page = await get(head.ownerUrl, BROWSER_HEADERS);
        const owner = page.ok ? parseChannelPage(await page.text()) : null;
        if (owner) avatarUrl = await inlineAvatar(owner.avatarUrl);
      } catch {
        // No avatar: the page shows an initial.
      }
    }
    return {
      channelId: playlistId,
      kind: 'playlist',
      title: head.title,
      owner: head.owner,
      avatarUrl,
      url: `https://www.youtube.com/playlist?list=${playlistId}`
    };
  }

  return {
    async resolve(ref) {
      if (ref.kind === 'playlist') return resolvePlaylist(ref.playlistId);
      const url = ref.kind === 'page' ? ref.url : await pageUrlForVideo(ref.youtubeId);
      const response = await get(url, BROWSER_HEADERS);
      if (response.status === 404) throw new ChannelLookupError(`YouTube has no channel at ${url}.`);
      if (!response.ok) throw new ChannelLookupError(`YouTube answered ${response.status} for ${url}.`);
      const info = parseChannelPage(await response.text());
      if (info === null) throw new ChannelLookupError(`Could not read the channel at ${url}.`);
      return { ...info, avatarUrl: await inlineAvatar(info.avatarUrl) };
    },

    async feed(channelId) {
      const response = await get(await feedUrl(channelId));
      if (!response.ok) throw new ChannelLookupError(`YouTube answered ${response.status} for the channel's uploads.`);
      return parseFeed(await response.text());
    }
  };
}
