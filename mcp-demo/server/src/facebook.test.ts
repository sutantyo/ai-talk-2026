import { describe, expect, it } from 'vitest';
import { createFacebookLookup, parseFacebookPlayerPage, parseFacebookReel } from './facebook.js';

describe('parseFacebookReel', () => {
  it.each([
    'https://www.facebook.com/reel/1804615860166129',
    'https://m.facebook.com/reel/1804615860166129/',
    'facebook.com/reel/1804615860166129?mibextid=abc'
  ])('reads %s', (input) => {
    expect(parseFacebookReel(input)).toEqual({ reelId: '1804615860166129', url: 'https://www.facebook.com/reel/1804615860166129' });
  });

  it.each(['https://www.facebook.com/somepage', 'https://evil.example/reel/1804615860166129', 'https://youtu.be/dQw4w9WgXcQ'])(
    'refuses %s',
    (input) => {
      expect(parseFacebookReel(input)).toBeNull();
    }
  );
});

const PAGE =
  '<img class="x" src="https://scontent.example.fbcdn.net/v/t51.71878-10/poster.jpg?stp=a&amp;oe=6AED3F09" />' +
  '<img src="https://scontent.example.fbcdn.net/v/t39.30808-1/profile.jpg?x=1" alt="" aria-label="Josh Neille" role="img" />';

describe('parseFacebookPlayerPage', () => {
  it('takes the creator from the profile picture and the poster from the other image', () => {
    expect(parseFacebookPlayerPage(PAGE)).toEqual({
      creator: 'Josh Neille',
      posterUrl: 'https://scontent.example.fbcdn.net/v/t51.71878-10/poster.jpg?stp=a&oe=6AED3F09'
    });
  });

  it('gives up on a page without the reel', () => {
    expect(parseFacebookPlayerPage('<html>This video is unavailable</html>')).toBeNull();
  });
});

describe('createFacebookLookup', () => {
  const fetchFake = (async (url: string) =>
    String(url).includes('plugins/video.php')
      ? new Response(PAGE, { status: 200 })
      : new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/jpeg' } })) as unknown as typeof fetch;
  const reel = { reelId: '1804615860166129', url: 'https://www.facebook.com/reel/1804615860166129' };

  it('keeps a copy of the poster, marks it a Short, and uses the given title', async () => {
    expect(await createFacebookLookup(fetchFake)(reel, ' Wombat in the hay ')).toEqual({
      youtubeId: '1804615860166129',
      source: 'facebook',
      title: 'Wombat in the hay',
      channel: 'Josh Neille',
      thumbnailUrl: 'data:image/jpeg;base64,AQID',
      isShort: true
    });
  });

  it('falls back to "Reel by <creator>" without a title', async () => {
    expect((await createFacebookLookup(fetchFake)(reel, undefined)).title).toBe('Reel by Josh Neille');
  });
});
