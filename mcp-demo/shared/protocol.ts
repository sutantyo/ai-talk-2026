/**
 * What the browser and the server agree on. Kept small on purpose: the page
 * only reads the library, starts and ends a session, and marks a video watched.
 */

export const SESSION_COOKIE = 'couch_session';

export interface SessionResponse {
  signedIn: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
}

/**
 * The pages of the app. `watch` holds videos still to watch, `saved` holds
 * videos already watched and worth keeping, `shorts` holds YouTube Shorts; all
 * three are made of playlists. `channels` shows the latest uploads of channels
 * followed quietly. Shorts appear only on the `shorts` page.
 */
export type PlaylistPage = 'watch' | 'saved' | 'shorts';
export type PageId = 'watch' | 'saved' | 'channels' | 'shorts';
export const PLAYLIST_PAGES: readonly PlaylistPage[] = ['watch', 'saved', 'shorts'];
export const PAGES: readonly PageId[] = ['watch', 'saved', 'channels', 'shorts'];
export const PAGE_TITLES: Record<PageId, string> = {
  watch: 'To Watch',
  saved: 'Saved',
  channels: 'Channels',
  shorts: 'Shorts'
};

export interface Video {
  /** This app's own id for the entry; a YouTube video can sit in more than one playlist. */
  id: string;
  /** YouTube's 11-character video id. */
  youtubeId: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  /** A YouTube Short (vertical, up to 3 minutes). Only ever in `shorts` playlists. */
  isShort: boolean;
  addedAt: string;
  /** ISO time it was marked watched, or null. */
  watchedAt: string | null;
}

export interface Playlist {
  id: string;
  page: PlaylistPage;
  name: string;
  createdAt: string;
  videos: Video[];
}

export interface ChannelUpload {
  youtubeId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  isShort: boolean;
}

export interface Channel {
  /** YouTube's channel id, `UC` + 22 characters. */
  channelId: string;
  title: string;
  url: string;
  avatarUrl: string;
  /** When YouTube was last asked for this channel's uploads; null if never. */
  checkedAt: string | null;
  /** Newest first, at most 30, Shorts included (the page splits them out). */
  uploads: ChannelUpload[];
}

export interface LibraryResponse {
  playlists: Playlist[];
  /** Ordered by each channel's newest upload, newest first. */
  channels: Channel[];
}
