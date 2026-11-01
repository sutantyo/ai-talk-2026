import type { NewVideo } from './store.js';

/**
 * Pulls the 11-character video id out of the link shapes people actually
 * paste: watch?v=, youtu.be/, shorts/, embed/, live/, m.youtube.com, or the bare id.
 */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;

  let url: URL;
  try {
    url = new URL(text.includes('://') ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let candidate: string | null = null;
  if (host === 'youtu.be') {
    candidate = url.pathname.split('/')[1] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      candidate = url.searchParams.get('v');
    } else {
      const match = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
      candidate = match?.[2] ?? null;
    }
  }
  return candidate !== null && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
}

export class VideoLookupError extends Error {}

export type LookupVideo = (youtubeId: string) => Promise<NewVideo>;

/**
 * YouTube's oEmbed endpoint: title, channel and thumbnail from a link, with no
 * API key and no login (checked 2026-11-02). It answers 401/403 for videos
 * whose owners turned off embedding, and 400/404 for private or missing ones;
 * neither would play on the page, so both are refused.
 *
 * Called only when a video is added, never on a timer.
 */
export function createOEmbedLookup(fetchImpl: typeof fetch = fetch): LookupVideo {
  return async (youtubeId) => {
    const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`;
    let response: Response;
    try {
      response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(6000) });
    } catch {
      throw new VideoLookupError('YouTube did not answer in time. Try again in a moment.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new VideoLookupError(
        `Video ${youtubeId} cannot be played outside YouTube (its owner turned off embedding), so it was not added.`
      );
    }
    if (!response.ok) {
      throw new VideoLookupError(`YouTube has no public video with the id ${youtubeId}. It may be private or deleted.`);
    }
    const body = (await response.json()) as { title?: unknown; author_name?: unknown };
    const isShort = await isShortVideo(youtubeId, fetchImpl);
    return {
      youtubeId,
      source: 'youtube',
      title: typeof body.title === 'string' && body.title !== '' ? body.title : 'Untitled video',
      channel: typeof body.author_name === 'string' ? body.author_name : '',
      isShort,
      thumbnailUrl: thumbnailFor(youtubeId, isShort)
    };
  };
}

/**
 * A Short gets its own vertical thumbnail (oar2.jpg, 1080x1920; ordinary videos
 * have none). Everything else uses mqdefault: 16:9 at 320x180, unlike oEmbed's
 * hqdefault, which is 4:3 with black bars.
 */
export function thumbnailFor(youtubeId: string, isShort: boolean): string {
  return `https://i.ytimg.com/vi/${youtubeId}/${isShort ? 'oar2.jpg' : 'mqdefault.jpg'}`;
}

/**
 * oEmbed cannot tell a Short from a video. `youtube.com/shorts/<id>` can
 * (checked 2026-11-02): it answers 200 for a Short and redirects (303) to
 * `/watch` for anything else. If YouTube does not answer, the video is treated
 * as an ordinary one.
 */
export async function isShortVideo(youtubeId: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const response = await fetchImpl(`https://www.youtube.com/shorts/${youtubeId}`, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(6000)
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
