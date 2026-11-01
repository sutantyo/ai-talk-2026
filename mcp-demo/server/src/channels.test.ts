import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPgliteDb, migrate, type Db } from './db.js';
import { createUserStore } from './store.js';
import { ChangeHub, type LibraryChange } from './events.js';
import { ChannelService, CHECK_INTERVAL_MS } from './channels.js';
import type { ChannelSource, FeedUpload } from './youtubeChannels.js';

const CHANNEL = { channelId: 'UCOKHwx1VCdgnxwbjyb9Iu1g', kind: 'channel' as const, owner: '', title: 'Blender Guru', avatarUrl: '', url: 'https://www.youtube.com/channel/UCOKHwx1VCdgnxwbjyb9Iu1g' };

let db: Db;
let userId: string;
let clock = Date.parse('2026-11-02T00:00:00Z');
let feed: FeedUpload[] = [{ youtubeId: 'aaaaaaaaaaa', title: 'First', publishedAt: '2026-10-01T00:00:00.000Z', isShort: false }];
let feedCalls = 0;
const source: ChannelSource = {
  resolve: async () => CHANNEL,
  feed: async () => {
    feedCalls += 1;
    return feed;
  }
};
const changes = new ChangeHub();
const seen: LibraryChange[] = [];
let service: ChannelService;

beforeAll(async () => {
  db = await createPgliteDb(null);
  await migrate(db);
  userId = (await createUserStore(db).upsertUser({ sub: 'x', email: 'a@test.invalid', name: 'A' })).id;
  service = new ChannelService(db, source, changes, () => clock);
  changes.subscribe(userId, (c) => seen.push(c));
});

afterAll(() => db.end());

describe('ChannelService', () => {
  it('fetches uploads when a channel is followed, without calling them "new"', async () => {
    await service.follow(userId, CHANNEL);
    expect(feedCalls).toBe(1);
    expect(seen).toEqual([{ highlight: [`channel:${CHANNEL.channelId}`] }]);
  });

  it('does not ask YouTube again within 30 minutes', async () => {
    clock += CHECK_INTERVAL_MS - 1000;
    feed = [{ youtubeId: 'bbbbbbbbbbb', title: 'Second', publishedAt: '2026-11-01T00:00:00.000Z', isShort: true }, ...feed];
    expect(await service.refreshStale(userId)).toEqual([]);
    expect(feedCalls).toBe(1);
  });

  it('asks again after 30 minutes and reports only the new upload', async () => {
    clock += 2000;
    expect(await service.refreshStale(userId)).toEqual(['bbbbbbbbbbb']);
    expect(feedCalls).toBe(2);
    expect(seen.at(-1)).toEqual({ highlight: ['bbbbbbbbbbb'] });
    const [channel] = await service.list(userId);
    expect(channel.uploads.map((u) => [u.title, u.isShort, u.thumbnailUrl.split('/').pop()])).toEqual([
      ['Second', true, 'oar2.jpg'],
      ['First', false, 'mqdefault.jpg']
    ]);
  });

  it('shares one check between callers that arrive together', async () => {
    clock += CHECK_INTERVAL_MS + 1;
    await Promise.all([service.refreshStale(userId), service.refreshStale(userId), service.refreshStale(userId)]);
    expect(feedCalls).toBe(3);
  });
});
