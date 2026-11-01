/** What a card in a row needs, whether it comes from a playlist or a channel. */
export interface Tile {
  /** Unique within the page; also the key the "New" highlight uses. */
  key: string;
  youtubeId: string;
  title: string;
  /** The line under the title: a channel name, or how long ago it was uploaded. */
  sub: string;
  thumbnailUrl: string;
  /** Shorts get tall cards and the vertical player. */
  isShort: boolean;
  /** 'facebook' for a Facebook reel (then youtubeId holds the reel id). */
  source: 'youtube' | 'facebook';
  /** On channel uploads: which playlist pages already have this video ("✓ To Watch" when watched there). */
  tag?: string;
  watched: boolean;
  /** Set for playlist videos, which can be marked watched; absent for channel uploads. */
  videoId?: string;
  /** Where it lives, for the player: a playlist or a channel name. */
  context: string;
  channel: string;
}

export function ago(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
