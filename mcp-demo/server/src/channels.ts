import type { Db } from './db.js';
import type { Channel } from '../../shared/protocol.js';
import type { ChangeHub } from './events.js';
import type { ChannelInfo, ChannelSource } from './youtubeChannels.js';
import { thumbnailFor } from './youtube.js';

/** Never ask YouTube about one channel more often than this. */
export const CHECK_INTERVAL_MS = 30 * 60 * 1000;
/** Shorts included: the page shows them on the Shorts page, the rest on Channels. */
const UPLOADS_SHOWN = 30;

interface FeedRow {
  channel_id: string;
  title: string;
  avatar_url: string;
  url: string;
  checked_at: Date | string | null;
}

interface UploadRow {
  channel_id: string;
  youtube_id: string;
  title: string;
  published_at: Date | string;
  is_short: boolean;
}

const iso = (value: Date | string): string => new Date(value).toISOString();

export type FollowOutcome = { status: 'followed' | 'already_following'; channel: Channel };

/**
 * Following channels and keeping their latest uploads. Feeds are shared between
 * users (one check serves everyone following that channel); follows are per user.
 */
export class ChannelService {
  private inFlight = new Map<string, Promise<string[]>>();

  constructor(
    private db: Db,
    private source: ChannelSource,
    private changes: ChangeHub,
    private now: () => number = () => Date.now()
  ) {}

  /** The user's channels with their latest uploads, the channel with the newest upload first. */
  async list(userId: string): Promise<Channel[]> {
    const { rows: feeds } = await this.db.query<FeedRow>(
      `select f.channel_id, f.title, f.avatar_url, f.url, f.checked_at
         from channel_feeds f join channel_follows c on c.channel_id = f.channel_id
        where c.user_id = $1`,
      [userId]
    );
    if (feeds.length === 0) return [];
    const { rows: uploads } = await this.db.query<UploadRow>(
      `select u.channel_id, u.youtube_id, u.title, u.published_at, u.is_short
         from channel_uploads u join channel_follows c on c.channel_id = u.channel_id
        where c.user_id = $1
        order by u.published_at desc`,
      [userId]
    );
    const channels = feeds.map((f) => this.toChannel(f, uploads.filter((u) => u.channel_id === f.channel_id)));
    // Ordered by newest ordinary upload: that is what the Channels page shows.
    const newest = (c: Channel) => c.uploads.find((u) => !u.isShort)?.publishedAt ?? '';
    return channels.sort((a, b) => newest(b).localeCompare(newest(a)) || a.title.localeCompare(b.title));
  }

  /** Follows a channel (already resolved from a link) and fetches its uploads straight away. */
  async follow(userId: string, info: ChannelInfo): Promise<FollowOutcome> {
    await this.db.query(
      `insert into channel_feeds (channel_id, title, avatar_url, url) values ($1, $2, $3, $4)
       on conflict (channel_id) do update set title = excluded.title, avatar_url = excluded.avatar_url`,
      [info.channelId, info.title, info.avatarUrl, info.url]
    );
    const inserted = await this.db.query(
      `insert into channel_follows (user_id, channel_id) values ($1, $2) on conflict do nothing`,
      [userId, info.channelId]
    );
    await this.check(info.channelId);
    const channel = (await this.list(userId)).find((c) => c.channelId === info.channelId)!;
    this.changes.publish(userId, { highlight: [`channel:${info.channelId}`] });
    return { status: inserted.rowCount === 0 ? 'already_following' : 'followed', channel };
  }

  /**
   * Checks every channel this user follows that has not been checked in the last
   * 30 minutes. Tells the user's open pages when new uploads turn up.
   * Returns the ids of uploads seen for the first time.
   */
  async refreshStale(userId: string): Promise<string[]> {
    const cutoff = new Date(this.now() - CHECK_INTERVAL_MS).toISOString();
    const { rows } = await this.db.query<{ channel_id: string }>(
      `select f.channel_id from channel_feeds f join channel_follows c on c.channel_id = f.channel_id
        where c.user_id = $1 and (f.checked_at is null or f.checked_at < $2)`,
      [userId, cutoff]
    );
    const found = (await Promise.all(rows.map((r) => this.check(r.channel_id).catch(() => [])))).flat();
    if (found.length > 0) this.changes.publish(userId, { highlight: found });
    return found;
  }

  /** One feed check, shared by concurrent callers. Skips when checked recently. */
  private check(channelId: string): Promise<string[]> {
    const running = this.inFlight.get(channelId);
    if (running) return running;
    const job = this.runCheck(channelId).finally(() => this.inFlight.delete(channelId));
    this.inFlight.set(channelId, job);
    return job;
  }

  private async runCheck(channelId: string): Promise<string[]> {
    const { rows } = await this.db.query<{ checked_at: Date | string | null }>(
      'select checked_at from channel_feeds where channel_id = $1',
      [channelId]
    );
    const checkedAt = rows[0]?.checked_at;
    if (checkedAt && this.now() - new Date(checkedAt).getTime() < CHECK_INTERVAL_MS) return [];

    const uploads = await this.source.feed(channelId);
    const { rows: known } = await this.db.query<{ youtube_id: string }>(
      'select youtube_id from channel_uploads where channel_id = $1',
      [channelId]
    );
    const knownIds = new Set(known.map((r) => r.youtube_id));
    for (const upload of uploads) {
      await this.db.query(
        `insert into channel_uploads (channel_id, youtube_id, title, published_at, is_short) values ($1, $2, $3, $4, $5)
         on conflict (channel_id, youtube_id) do update set title = excluded.title, is_short = excluded.is_short`,
        [channelId, upload.youtubeId, upload.title, upload.publishedAt, upload.isShort]
      );
    }
    // On the first check everything is "new", which is noise, not news.
    const fresh = checkedAt ? uploads.filter((u) => !knownIds.has(u.youtubeId)).map((u) => u.youtubeId) : [];
    await this.db.query('update channel_feeds set checked_at = $2 where channel_id = $1', [
      channelId,
      new Date(this.now()).toISOString()
    ]);
    return fresh;
  }

  private toChannel(feed: FeedRow, uploads: UploadRow[]): Channel {
    return {
      channelId: feed.channel_id,
      title: feed.title,
      url: feed.url,
      avatarUrl: feed.avatar_url,
      checkedAt: feed.checked_at === null ? null : iso(feed.checked_at),
      uploads: uploads.slice(0, UPLOADS_SHOWN).map((u) => ({
        youtubeId: u.youtube_id,
        title: u.title,
        publishedAt: iso(u.published_at),
        isShort: u.is_short,
        thumbnailUrl: thumbnailFor(u.youtube_id, u.is_short)
      }))
    };
  }
}
