import type { Db } from './db.js';
import type { PlaylistPage, Playlist, Video } from '../../shared/protocol.js';

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
}

/** The user half: what sign-in and the OAuth routes need. */
export interface UserStore {
  upsertUser(identity: GoogleIdentity): Promise<UserRow>;
  userById(id: string): Promise<UserRow | null>;
}

export interface NewVideo {
  youtubeId: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  isShort: boolean;
}

export type AddVideoOutcome =
  | { status: 'added'; video: Video }
  | { status: 'already_there'; video: Video };

/** The library half: playlists and videos, always scoped to one user. */
export interface LibraryStore {
  listPlaylists(userId: string): Promise<Playlist[]>;
  /** Null when the user already has a playlist of that name on that page. */
  createPlaylist(userId: string, page: PlaylistPage, name: string): Promise<Playlist | null>;
  findPlaylist(userId: string, playlistId: string): Promise<Playlist | null>;
  addVideo(userId: string, playlistId: string, video: NewVideo): Promise<AddVideoOutcome | null>;
  /** Null when the video is not this user's. */
  setWatched(userId: string, videoId: string, watched: boolean): Promise<Video | null>;
}

interface PlaylistRow {
  id: string;
  page: PlaylistPage;
  name: string;
  created_at: Date | string;
}

interface VideoRow {
  id: string;
  playlist_id: string;
  youtube_id: string;
  title: string;
  channel: string;
  thumbnail_url: string;
  is_short: boolean;
  added_at: Date | string;
  watched_at: Date | string | null;
}

const iso = (value: Date | string): string => new Date(value).toISOString();

function toVideo(row: VideoRow): Video {
  return {
    id: row.id,
    youtubeId: row.youtube_id,
    title: row.title,
    channel: row.channel,
    thumbnailUrl: row.thumbnail_url,
    isShort: row.is_short,
    addedAt: iso(row.added_at),
    watchedAt: row.watched_at === null ? null : iso(row.watched_at)
  };
}

function toPlaylist(row: PlaylistRow, videos: Video[]): Playlist {
  return { id: row.id, page: row.page, name: row.name, createdAt: iso(row.created_at), videos };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createUserStore(db: Db): UserStore {
  return {
    async upsertUser(identity) {
      const { rows } = await db.query<UserRow>(
        `insert into users (google_sub, email, name)
         values ($1, $2, $3)
         on conflict (google_sub) do update set email = excluded.email, name = excluded.name
         returning id, email, name`,
        [identity.sub, identity.email, identity.name]
      );
      return rows[0];
    },
    async userById(id) {
      if (!UUID.test(id)) return null;
      const { rows } = await db.query<UserRow>('select id, email, name from users where id = $1', [id]);
      return rows[0] ?? null;
    }
  };
}

export function createLibraryStore(db: Db): LibraryStore {
  const videoColumns =
    'v.id, v.playlist_id, v.youtube_id, v.title, v.channel, v.thumbnail_url, v.is_short, v.added_at, v.watched_at';

  async function videosOf(userId: string, playlistId: string | null): Promise<VideoRow[]> {
    const { rows } = await db.query<VideoRow>(
      `select ${videoColumns}
         from videos v join playlists p on p.id = v.playlist_id
        where p.user_id = $1 ${playlistId === null ? '' : 'and p.id = $2'}
        order by v.added_at desc, v.id`,
      playlistId === null ? [userId] : [userId, playlistId]
    );
    return rows;
  }

  async function findPlaylist(userId: string, playlistId: string): Promise<Playlist | null> {
    if (!UUID.test(playlistId)) return null;
    const { rows } = await db.query<PlaylistRow>(
      'select id, page, name, created_at from playlists where user_id = $1 and id = $2',
      [userId, playlistId]
    );
    if (rows[0] === undefined) return null;
    return toPlaylist(rows[0], (await videosOf(userId, playlistId)).map(toVideo));
  }

  return {
    async listPlaylists(userId) {
      const { rows } = await db.query<PlaylistRow>(
        'select id, page, name, created_at from playlists where user_id = $1 order by created_at, id',
        [userId]
      );
      const videos = await videosOf(userId, null);
      return rows.map((row) =>
        toPlaylist(
          row,
          videos.filter((v) => v.playlist_id === row.id).map(toVideo)
        )
      );
    },

    async createPlaylist(userId, page, name) {
      const { rows } = await db.query<PlaylistRow>(
        `insert into playlists (user_id, page, name) values ($1, $2, $3)
         on conflict do nothing
         returning id, page, name, created_at`,
        [userId, page, name]
      );
      return rows[0] === undefined ? null : toPlaylist(rows[0], []);
    },

    findPlaylist,

    async addVideo(userId, playlistId, video) {
      const playlist = await findPlaylist(userId, playlistId);
      if (playlist === null) return null;
      const existing = playlist.videos.find((v) => v.youtubeId === video.youtubeId);
      if (existing !== undefined) return { status: 'already_there', video: existing };
      const { rows } = await db.query<VideoRow>(
        `insert into videos (playlist_id, youtube_id, title, channel, thumbnail_url, is_short)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (playlist_id, youtube_id) do update set title = excluded.title
         returning id, playlist_id, youtube_id, title, channel, thumbnail_url, is_short, added_at, watched_at`,
        [playlistId, video.youtubeId, video.title, video.channel, video.thumbnailUrl, video.isShort]
      );
      return { status: 'added', video: toVideo(rows[0]) };
    },

    async setWatched(userId, videoId, watched) {
      if (!UUID.test(videoId)) return null;
      const { rows } = await db.query<VideoRow>(
        `update videos v set watched_at = ${watched ? 'now()' : 'null'}
           from playlists p
          where p.id = v.playlist_id and p.user_id = $1 and v.id = $2
          returning ${videoColumns}`,
        [userId, videoId]
      );
      return rows[0] === undefined ? null : toVideo(rows[0]);
    }
  };
}
