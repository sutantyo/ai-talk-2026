import type { NewVideo } from './store.js';
import { VideoLookupError } from './youtube.js';

/**
 * Facebook reels (added 2026-11-02, Daniel's request). Facebook gives far less
 * than YouTube, all checked once on 2026-11-02 with facebook.com/reel/1804615860166129:
 * - Its oEmbed endpoint answers without a key but returns only embed code: no
 *   title, no creator, no thumbnail. The reel page itself answers HTTP 400.
 * - Its embeddable player page (`/plugins/video.php?href=…`) plays the reel
 *   without a login and names the creator (`aria-label` on their picture) and
 *   carries a poster image (526x934). It has no caption, so the title comes from
 *   whoever adds the reel, or falls back to "Reel by <creator>".
 * - The poster's link expires within days (`oe=` in the URL), so a copy is kept
 *   as a `data:` URL.
 * - Unlike YouTube's privacy-enhanced player, Facebook's player loads Facebook's
 *   own scripts as soon as it appears. Daniel accepted that.
 * Reels are vertical, so they count as Shorts: they go only on the Shorts page.
 */

export interface FacebookReel {
  reelId: string;
  url: string;
}

/** facebook.com/reel/<digits>, with or without www., m. or web. */
export function parseFacebookReel(input: string): FacebookReel | null {
  let url: URL;
  try {
    const text = input.trim();
    url = new URL(text.includes('://') ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|web)\./, '');
  if (host !== 'facebook.com') return null;
  const match = url.pathname.match(/^\/reel\/([0-9]{5,25})\/?$/);
  return match ? { reelId: match[1], url: `https://www.facebook.com/reel/${match[1]}` } : null;
}

/** The player page Facebook offers for embedding, also used by the page's own player. */
export function facebookPlayerUrl(reelId: string): string {
  const href = encodeURIComponent(`https://www.facebook.com/reel/${reelId}`);
  return `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&width=360`;
}

function decodeAttribute(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Creator name and poster image out of the player page's HTML. */
export function parseFacebookPlayerPage(html: string): { creator: string; posterUrl: string } | null {
  const images = [...html.matchAll(/<img[^>]+src="(https:\/\/scontent[^"]+)"/g)].map((m) => decodeAttribute(m[1]));
  // Profile pictures live under /t39.30808-1/; the reel's poster does not.
  const posterUrl = images.find((url) => !url.includes('/t39.30808-1/'));
  const creator = html.match(/aria-label="([^"]+)" role="img"/);
  if (!posterUrl && !creator) return null;
  return { creator: creator ? decodeAttribute(creator[1]) : '', posterUrl: posterUrl ?? '' };
}

export type LookupFacebookReel = (reel: FacebookReel, title: string | undefined) => Promise<NewVideo>;

const BROWSER_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'accept-language': 'en'
};

const MAX_POSTER_BYTES = 400 * 1024;

export function createFacebookLookup(fetchImpl: typeof fetch = fetch): LookupFacebookReel {
  return async (reel, title) => {
    let html: string;
    try {
      const response = await fetchImpl(facebookPlayerUrl(reel.reelId), {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new VideoLookupError(`Facebook answered ${response.status} for reel ${reel.reelId}.`);
      html = await response.text();
    } catch (error) {
      if (error instanceof VideoLookupError) throw error;
      throw new VideoLookupError('Facebook did not answer in time. Try again in a moment.');
    }

    const page = parseFacebookPlayerPage(html);
    if (page === null) {
      throw new VideoLookupError(`Facebook would not show reel ${reel.reelId} outside Facebook. It may be private or deleted.`);
    }

    let thumbnailUrl = '';
    if (page.posterUrl !== '') {
      try {
        const poster = await fetchImpl(page.posterUrl, { signal: AbortSignal.timeout(8000) });
        const type = poster.headers.get('content-type') ?? '';
        const bytes = Buffer.from(await poster.arrayBuffer());
        if (poster.ok && type.startsWith('image/') && bytes.length <= MAX_POSTER_BYTES) {
          thumbnailUrl = `data:${type.split(';')[0]};base64,${bytes.toString('base64')}`;
        }
      } catch {
        // No copy: the card shows a dark tile instead.
      }
    }

    const cleanTitle = title?.trim().slice(0, 200);
    return {
      youtubeId: reel.reelId,
      source: 'facebook',
      title: cleanTitle || (page.creator ? `Reel by ${page.creator}` : 'Facebook reel'),
      channel: page.creator,
      thumbnailUrl,
      isShort: true
    };
  };
}
