import { describe, expect, it } from 'vitest';
import { parseChannelPage, parseChannelRef, parseFeed } from './youtubeChannels.js';

describe('parseChannelRef', () => {
  it.each([
    ['@blenderguru', 'https://www.youtube.com/@blenderguru'],
    ['https://www.youtube.com/@kurzgesagt/videos', 'https://www.youtube.com/@kurzgesagt'],
    ['youtube.com/@mkbhd', 'https://www.youtube.com/@mkbhd'],
    ['UCOKHwx1VCdgnxwbjyb9Iu1g', 'https://www.youtube.com/channel/UCOKHwx1VCdgnxwbjyb9Iu1g'],
    ['https://m.youtube.com/channel/UCOKHwx1VCdgnxwbjyb9Iu1g', 'https://www.youtube.com/channel/UCOKHwx1VCdgnxwbjyb9Iu1g'],
    ['https://www.youtube.com/c/SomeName', 'https://www.youtube.com/c/SomeName'],
    ['https://www.youtube.com/user/someone', 'https://www.youtube.com/user/someone']
  ])('reads %s as a channel page', (input, url) => {
    expect(parseChannelRef(input)).toEqual({ kind: 'page', url });
  });

  it('reads a video link as "the channel of this video"', () => {
    expect(parseChannelRef('https://youtu.be/dQw4w9WgXcQ')).toEqual({ kind: 'video', youtubeId: 'dQw4w9WgXcQ' });
  });

  it.each(['https://vimeo.com/1', 'hello', '@x', 'https://evil.example/@blenderguru'])('refuses %s', (input) => {
    expect(parseChannelRef(input)).toBeNull();
  });
});

describe('parseChannelPage', () => {
  it('reads id, name and avatar from the page head', () => {
    const html =
      '<link rel="canonical" href="https://www.youtube.com/channel/UCsXVk37bltHxD1rDPwtNM8Q">' +
      '<meta property="og:title" content="Kurzgesagt &ndash; In a Nutshell &amp; more">' +
      '<meta property="og:image" content="https://yt3.googleusercontent.com/abc=s900-c-k-no-rj">';
    expect(parseChannelPage(html)).toEqual({
      channelId: 'UCsXVk37bltHxD1rDPwtNM8Q',
      title: 'Kurzgesagt &ndash; In a Nutshell & more',
      avatarUrl: 'https://yt3.googleusercontent.com/abc=s88-c-k-no-rj',
      url: 'https://www.youtube.com/channel/UCsXVk37bltHxD1rDPwtNM8Q'
    });
  });

  it('gives up on a page that is not a channel (a consent wall, say)', () => {
    expect(parseChannelPage('<html><title>Before you continue</title></html>')).toBeNull();
  });
});

describe('parseFeed', () => {
  it('reads entries newest first and skips the channel-level <published>', () => {
    const xml = `<feed><title>Blender Guru</title><published>2009-12-09T12:06:42+00:00</published>
      <entry><yt:videoId>aaaaaaaaaaa</yt:videoId><title>Old &amp; gold</title><link rel="alternate" href="https://www.youtube.com/watch?v=aaaaaaaaaaa"/><published>2026-10-17T01:55:40+00:00</published></entry>
      <entry><yt:videoId>bbbbbbbbbbb</yt:videoId><title>New</title><link rel="alternate" href="https://www.youtube.com/shorts/bbbbbbbbbbb"/><published>2026-10-28T23:17:30+00:00</published></entry>
      <entry><yt:videoId>broken</yt:videoId><title>Skipped</title><published>2026-10-29T00:00:00+00:00</published></entry>
    </feed>`;
    expect(parseFeed(xml)).toEqual([
      { youtubeId: 'bbbbbbbbbbb', title: 'New', publishedAt: '2026-10-28T23:17:30.000Z', isShort: true },
      { youtubeId: 'aaaaaaaaaaa', title: 'Old & gold', publishedAt: '2026-10-17T01:55:40.000Z', isShort: false }
    ]);
  });
});
