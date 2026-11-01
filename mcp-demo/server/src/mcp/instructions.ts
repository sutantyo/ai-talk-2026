/** The MCP `instructions` field: what a model needs that the tool schemas cannot say. */
export const SERVER_INSTRUCTIONS = `This is one person's YouTube organiser, a private page of videos sorted into playlists.

It has four pages:
- "watch" (shown as "To Watch"): videos they still want to watch.
- "saved" (shown as "Saved"): videos they have watched and want to keep.
- "shorts" (shown as "Shorts"): YouTube Shorts, and nothing else.
- "Channels": channels they follow quietly, without subscribing on YouTube, with their latest uploads. A single playlist (a series) can be followed the same way.

The first three hold playlists, shown as rows of video thumbnails. You can list playlists, create a playlist on any of those three pages, add videos to a playlist, follow a channel and list what channels uploaded. Shorts belong only on the Shorts page: add_videos refuses a Short for a To Watch or Saved playlist, and an ordinary video for a Shorts playlist, so when it refuses one, offer a playlist on the right page. A channel's Shorts show on the Shorts page, not on Channels. Facebook reels (facebook.com/reel/…) can be added too; they count as Shorts, and since Facebook gives no title, pass a short descriptive one with the link. You cannot delete, rename or move anything, and marking a video watched is done by the owner on the page.

When asked to add a video without a playlist named, call list_playlists first and pick the closest fit, or suggest a new playlist. Prefer the "watch" page unless the owner says they have already watched the video; a Short goes on the "shorts" page. Changes appear on the owner's open page straight away.`;
