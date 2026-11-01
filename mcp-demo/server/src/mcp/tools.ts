import { LIBRARY_READ, LIBRARY_WRITE } from '../oauth/scope.js';
import type { LibraryStore } from '../store.js';
import type { ChangeHub } from '../events.js';
import type { ChannelService } from '../channels.js';
import { ChannelLookupError, parseChannelRef, type ChannelSource } from '../youtubeChannels.js';
import { parseYouTubeId, VideoLookupError, type LookupVideo } from '../youtube.js';
import { PLAYLIST_PAGES, PAGE_TITLES, type PlaylistPage, type Playlist } from '../../../shared/protocol.js';

/**
 * What Claude can do to the organiser, and nothing else. There is no delete,
 * no rename and no move: the tool list is the guard, so "clear out my old
 * playlists" cannot mean what it says. Marking a video watched is done on the
 * page, not here.
 */

export interface ToolContext {
  library: LibraryStore;
  lookupVideo: LookupVideo;
  changes: ChangeHub;
  channels: ChannelService;
  channelSource: ChannelSource;
  userId: string;
  scope: string;
}

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  scope: string;
  run(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}

const MAX_VIDEOS_PER_CALL = 20;

function toolError(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function ok(text: string, structuredContent?: unknown): ToolResult {
  return { content: [{ type: 'text', text }], ...(structuredContent === undefined ? {} : { structuredContent }) };
}

const PAGE_RULE = 'page must be "watch", "saved" or "shorts".';

function isPage(value: unknown): value is PlaylistPage {
  return typeof value === 'string' && (PLAYLIST_PAGES as readonly string[]).includes(value);
}

function describePlaylist(p: Playlist): string {
  const lines = [`- "${p.name}" (id ${p.id}, ${p.videos.length} video${p.videos.length === 1 ? '' : 's'})`];
  for (const v of p.videos) {
    lines.push(`    • ${v.title} — ${v.channel || 'unknown channel'}${v.watchedAt ? ' [watched]' : ''} (youtu.be/${v.youtubeId})`);
  }
  return lines.join('\n');
}

/**
 * Finds the playlist a call means: by id, or by name (ignoring case). A name
 * used on both pages needs `page` to say which.
 */
async function resolvePlaylist(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<{ playlist: Playlist } | { error: string }> {
  const ref = typeof args.playlist === 'string' ? args.playlist.trim() : '';
  if (ref === '') return { error: 'Say which playlist: its name or its id. list_playlists shows them.' };
  const page = args.page;
  if (page !== undefined && !isPage(page)) return { error: PAGE_RULE };

  const all = await context.library.listPlaylists(context.userId);
  const byId = all.find((p) => p.id === ref);
  if (byId !== undefined) return { playlist: byId };

  const named = all.filter((p) => p.name.toLowerCase() === ref.toLowerCase() && (page === undefined || p.page === page));
  if (named.length === 1) return { playlist: named[0] };
  if (named.length > 1) {
    return { error: `There is a "${ref}" playlist on more than one page. Say page "watch", "saved" or "shorts".` };
  }
  const names = all
    .filter((p) => page === undefined || p.page === page)
    .map((p) => `"${p.name}" (${PAGE_TITLES[p.page]})`);
  return {
    error:
      `No playlist called "${ref}"${page === undefined ? '' : ` on the ${PAGE_TITLES[page]} page`}. ` +
      (names.length === 0 ? 'There are no playlists yet; create_playlist makes one.' : `The playlists are: ${names.join(', ')}.`)
  };
}

const TOOLS: ToolDefinition[] = [
  {
    name: 'list_playlists',
    title: 'List playlists',
    description:
      'Lists the playlists on each playlist page of the organiser, with their videos. The "watch" page (shown as "To Watch") holds videos still to watch; the "saved" page holds videos already watched and worth keeping; the "shorts" page holds YouTube Shorts, and only Shorts.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'string', enum: ['watch', 'saved', 'shorts'], description: 'Only this page. Omit for all three.' }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true },
    scope: LIBRARY_READ,
    async run(args, context) {
      if (args.page !== undefined && !isPage(args.page)) return toolError(PAGE_RULE);
      const all = await context.library.listPlaylists(context.userId);
      const pages = args.page === undefined ? PLAYLIST_PAGES : [args.page as PlaylistPage];
      const sections = pages.map((page) => {
        const lists = all.filter((p) => p.page === page);
        return `${PAGE_TITLES[page]} page ("${page}"):\n` + (lists.length === 0 ? '  (no playlists)' : lists.map(describePlaylist).join('\n'));
      });
      return ok(sections.join('\n\n'), {
        playlists: all
          .filter((p) => pages.includes(p.page))
          .map((p) => ({ ...p, videos: p.videos.map((v) => ({ title: v.title, channel: v.channel, youtubeId: v.youtubeId, watched: v.watchedAt !== null })) }))
      });
    }
  },
  {
    name: 'create_playlist',
    title: 'Create a playlist',
    description:
      'Creates an empty playlist (a row of videos) on one page: "watch" (To Watch, videos still to watch), "saved" (Saved, videos already watched and worth keeping) or "shorts" (Shorts, for YouTube Shorts only). Names are unique within a page, ignoring case.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'string', enum: ['watch', 'saved', 'shorts'] },
        name: { type: 'string', minLength: 1, maxLength: 80, description: 'Short, like "Blender" or "Japanese listening".' }
      },
      required: ['page', 'name'],
      additionalProperties: false
    },
    scope: LIBRARY_WRITE,
    async run(args, context) {
      if (!isPage(args.page)) return toolError(PAGE_RULE);
      const name = typeof args.name === 'string' ? args.name.trim().replace(/\s+/g, ' ') : '';
      if (name === '' || name.length > 80) return toolError('name must be 1 to 80 characters.');
      const created = await context.library.createPlaylist(context.userId, args.page, name);
      if (created === null) {
        return toolError(`There is already a playlist called "${name}" on the ${PAGE_TITLES[args.page]} page.`);
      }
      context.changes.publish(context.userId, { highlight: [created.id] });
      return ok(`Created "${created.name}" on the ${PAGE_TITLES[created.page]} page (id ${created.id}).`, { playlist: created });
    }
  },
  {
    name: 'add_videos',
    title: 'Add videos to a playlist',
    description: `Adds YouTube videos to one playlist, by link (youtube.com/watch?v=…, youtu.be/…, shorts/…) or 11-character video id. Up to ${MAX_VIDEOS_PER_CALL} per call. Title, channel and thumbnail are looked up from YouTube. A video already in that playlist is left as it is. Videos whose owners turned off embedding are refused, because they cannot play on the page. Shorts go only into playlists on the "shorts" page, and those playlists take only Shorts: anything else is refused with the reason, so put it in a playlist on the right page.`,
    inputSchema: {
      type: 'object',
      properties: {
        playlist: { type: 'string', description: 'The playlist name (or id) from list_playlists.' },
        page: { type: 'string', enum: ['watch', 'saved', 'shorts'], description: 'Needed only when more than one page has a playlist with that name.' },
        videos: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: MAX_VIDEOS_PER_CALL,
          description: 'YouTube links or video ids.'
        }
      },
      required: ['playlist', 'videos'],
      additionalProperties: false
    },
    scope: LIBRARY_WRITE,
    async run(args, context) {
      const links = args.videos;
      if (!Array.isArray(links) || links.length === 0 || links.some((l) => typeof l !== 'string')) {
        return toolError('videos must be a list of YouTube links or ids.');
      }
      if (links.length > MAX_VIDEOS_PER_CALL) return toolError(`At most ${MAX_VIDEOS_PER_CALL} videos per call.`);
      const found = await resolvePlaylist(args, context);
      if ('error' in found) return toolError(found.error);
      const { playlist } = found;

      const lines: string[] = [];
      const added: string[] = [];
      for (const link of links as string[]) {
        const youtubeId = parseYouTubeId(link);
        if (youtubeId === null) {
          lines.push(`✗ ${link}: not a YouTube video link.`);
          continue;
        }
        try {
          const details = await context.lookupVideo(youtubeId);
          if (details.isShort && playlist.page !== 'shorts') {
            lines.push(`✗ "${details.title}" is a YouTube Short. Shorts go only in a playlist on the Shorts page.`);
            continue;
          }
          if (!details.isShort && playlist.page === 'shorts') {
            lines.push(`✗ "${details.title}" is not a Short. The Shorts page takes only Shorts; use a playlist on To Watch or Saved.`);
            continue;
          }
          const outcome = await context.library.addVideo(context.userId, playlist.id, details);
          if (outcome === null) {
            lines.push(`✗ ${link}: the playlist no longer exists.`);
          } else if (outcome.status === 'already_there') {
            lines.push(`• "${outcome.video.title}" was already in this playlist.`);
          } else {
            added.push(outcome.video.id);
            lines.push(`✓ "${outcome.video.title}" (${outcome.video.channel})`);
          }
        } catch (error) {
          if (!(error instanceof VideoLookupError)) throw error;
          lines.push(`✗ ${link}: ${error.message}`);
        }
      }
      if (added.length > 0) context.changes.publish(context.userId, { highlight: added });
      const header = `Added ${added.length} of ${links.length} to "${playlist.name}" on the ${PAGE_TITLES[playlist.page]} page.`;
      return { content: [{ type: 'text', text: `${header}\n${lines.join('\n')}` }], isError: added.length === 0 && lines.every((l) => l.startsWith('✗')) };
    }
  }
];

function ago(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

TOOLS.push(
  {
    name: 'follow_channel',
    title: 'Follow a channel quietly',
    description:
      'Follows a YouTube channel on the Channels page, without subscribing on YouTube (YouTube never learns about it). Accepts @handle, a channel link, or a link to one of its videos. Its latest uploads appear on the page, newest first, and are checked again at most every 30 minutes.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'e.g. "@blenderguru", "https://www.youtube.com/@kurzgesagt", or a video link.' }
      },
      required: ['channel'],
      additionalProperties: false
    },
    scope: LIBRARY_WRITE,
    async run(args, context) {
      const ref = typeof args.channel === 'string' ? parseChannelRef(args.channel) : null;
      if (ref === null) return toolError('That is not a YouTube channel, @handle or video link.');
      try {
        const info = await context.channelSource.resolve(ref);
        const { status, channel } = await context.channels.follow(context.userId, info);
        const latest = channel.uploads[0];
        return ok(
          `${status === 'followed' ? 'Now following' : 'Already following'} ${channel.title} (${channel.uploads.length} recent uploads).` +
            (latest ? ` Newest: ${latest.isShort ? 'a Short, ' : ''}"${latest.title}", ${ago(latest.publishedAt)}.` : '')
        );
      } catch (error) {
        if (error instanceof ChannelLookupError) return toolError(error.message);
        throw error;
      }
    }
  },
  {
    name: 'list_channels',
    title: 'Latest from followed channels',
    description:
      'Lists the channels followed on the Channels page with their latest uploads and upload times, newest first; Shorts are marked [Short] (the page shows those on the Shorts page). Checks YouTube first for any channel not checked in the last 30 minutes. Use it for "what is new from my channels?".',
    inputSchema: {
      type: 'object',
      properties: {
        per_channel: { type: 'integer', minimum: 1, maximum: 15, description: 'Uploads per channel. Default 5.' }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true },
    scope: LIBRARY_READ,
    async run(args, context) {
      const perChannel =
        typeof args.per_channel === 'number' ? Math.min(Math.max(Math.floor(args.per_channel), 1), 15) : 5;
      await context.channels.refreshStale(context.userId).catch(() => []);
      const channels = await context.channels.list(context.userId);
      if (channels.length === 0) return ok('No channels followed yet. follow_channel adds one.');
      const text = channels
        .map((c) =>
          [
            `${c.title} (${c.url})`,
            ...c.uploads
              .slice(0, perChannel)
              .map((u) => `    • ${u.isShort ? '[Short] ' : ''}${u.title} — ${ago(u.publishedAt)} (youtu.be/${u.youtubeId})`)
          ].join('\n')
        )
        .join('\n\n');
      return ok(text);
    }
  }
);

/** The `tools/list` payload. Deterministic order. */
export function toolDescriptors(): Array<Record<string, unknown>> {
  return TOOLS.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    ...(tool.annotations === undefined ? {} : { annotations: tool.annotations })
  }));
}

export function findTool(name: unknown): ToolDefinition | null {
  if (typeof name !== 'string') return null;
  return TOOLS.find((tool) => tool.name === name) ?? null;
}

/** Split on whitespace: a substring check would let `library.readonly` pass for `library.read`. */
export function grantsScope(granted: string, required: string): boolean {
  return granted.split(/\s+/).includes(required);
}
