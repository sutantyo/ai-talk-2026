import { describe, expect, it } from 'vitest';
import { createOEmbedLookup, isShortVideo, parseYouTubeId, VideoLookupError } from './youtube.js';

describe('parseYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ?feature=share', 'dQw4w9WgXcQ'],
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['  dQw4w9WgXcQ  ', 'dQw4w9WgXcQ']
  ])('reads %s', (input, id) => {
    expect(parseYouTubeId(input)).toBe(id);
  });

  it.each([
    'https://vimeo.com/123456789',
    'https://www.youtube.com/@RickAstleyYT',
    'https://www.youtube.com/watch?v=short',
    'https://evil.example/watch?v=dQw4w9WgXcQ',
    'not a link at all'
  ])('refuses %s', (input) => {
    expect(parseYouTubeId(input)).toBeNull();
  });
});

describe('createOEmbedLookup', () => {
  /** oEmbed answers `status`; the /shorts/ probe answers `shortsStatus` (200 = a Short, 303 = not). */
  const respond = (status: number, body: unknown = {}, shortsStatus = 303) =>
    (async (url: string) =>
      String(url).includes('/shorts/')
        ? new Response(null, { status: shortsStatus })
        : new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it('takes title and channel from oEmbed and builds a 16:9 thumbnail', async () => {
    const lookup = createOEmbedLookup(respond(200, { title: 'A video', author_name: 'A channel' }));
    expect(await lookup('dQw4w9WgXcQ')).toEqual({
      youtubeId: 'dQw4w9WgXcQ',
      source: 'youtube',
      title: 'A video',
      channel: 'A channel',
      isShort: false,
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
    });
  });

  it('marks a Short and gives it the vertical thumbnail', async () => {
    const lookup = createOEmbedLookup(respond(200, { title: 'Short', author_name: 'C' }, 200));
    expect(await lookup('T-JRRc2F7rA')).toMatchObject({
      isShort: true,
      thumbnailUrl: 'https://i.ytimg.com/vi/T-JRRc2F7rA/oar2.jpg'
    });
  });

  it('refuses a video that cannot be embedded', async () => {
    await expect(createOEmbedLookup(respond(401))('dQw4w9WgXcQ')).rejects.toThrow(/embedding/);
  });

  it('refuses a private or missing video', async () => {
    await expect(createOEmbedLookup(respond(404))('dQw4w9WgXcQ')).rejects.toBeInstanceOf(VideoLookupError);
  });
});

describe('isShortVideo', () => {
  it('treats a failed check as an ordinary video', async () => {
    const failing = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await isShortVideo('dQw4w9WgXcQ', failing)).toBe(false);
  });
});
