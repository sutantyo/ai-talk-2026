# CLAUDE.md

Context for Claude sessions in this folder: **Couch**, a YouTube organiser controlled through MCP, built as an MCP
demo for Daniel's talk "Coding ≠ Typing" and as a tool he keeps using afterwards. It lives inside the talk's repo
(`sutantyo/ai-talk-2026`, public) so it travels with it in git, but it is **its own project**.

**About the other CLAUDE.md:** Claude Code also loads `../CLAUDE.md`, the talk deck's context. Treat that as
background only: don't act on its tasks or open questions here, and don't touch `../slides/` or anything else
outside this folder unless Daniel asks. The rules from it that apply here are repeated under Constraints below.

## What it is (built 2026-11-02, deployed 2026-11-02 at https://couch-test.up.railway.app)

A Netflix-style page with a **page switcher**: **To Watch** (videos still to watch), **Saved** (watched and
worth keeping), **Channels** and **Shorts** (both added 2026-11-02). To Watch, Saved and Shorts are series of
**playlists**, shown as rows of thumbnails. Channels has one row per channel followed **quietly** (no YouTube
subscription) with its latest ordinary uploads newest first, the channel that uploaded most recently at the top.
On To Watch, Saved and Channels the newest video is a compact "Up next" strip at the top: thumbnail on
the left, title, channel and buttons beside it (Daniel's choice, 2026-11-02). A full-width Netflix banner was tried
and dropped twice: YouTube thumbnails top out at 1280x720, so stretched across the screen they pixelate, and a
sharp thumbnail-sized banner left a gap on his ~2000 px-wide screen.

**Shorts live only on the Shorts page** (Daniel, 2026-11-02), enforced by the MCP server: `add_videos` refuses a
Short for a To Watch or Saved playlist and an ordinary video for a Shorts playlist, saying which page to use; a
followed channel's Shorts are split off Channels into a "From your channels" row on the Shorts page. The Shorts
page has its own setup: tall 9:16 cards (YouTube's vertical `oar2.jpg` thumbnail), no hero, "Play from the top",
and a vertical player where ↑/↓, the wheel or a swipe moves to the next Short in that row. Because the YouTube
player is an iframe that swallows clicks, keys and wheel scrolls, a clear layer covers the Short (except YouTube's
control bar); a click on it pauses or plays through YouTube's IFrame API messages (`enablejsapi=1`), and the player
reports its state back. Clicking a video plays it on the page in YouTube's privacy-enhanced player
(`youtube-nocookie.com`). No YouTube login or API key anywhere.

**Who changes what.** Organising goes only through Claude, over MCP. The page has only small actions: play, and
**mark watched** (on To Watch and Shorts playlists; a tick, dimmed thumbnail and red bar). Daniel relaxed the original "no editing on
the page" rule to allow that (2026-11-02).

**MCP tools** (`server/src/mcp/tools.ts`), exactly what Daniel asked for:
- `list_playlists`: both pages, or one, with their videos.
- `create_playlist`: on `watch`, `saved` or `shorts`; names unique per page, ignoring case.
- `add_videos`: up to 20 links or ids into one playlist (by name or id). Title, channel and thumbnail come from
  YouTube's oEmbed; videos with embedding turned off are refused, because they can't play on the page. Shorts
  only into `shorts` playlists, and only Shorts there.
  **Facebook reels** too (2026-11-02, `server/src/facebook.ts`): `facebook.com/reel/<id>`, as `{ link, title }`
  because Facebook gives no title (else "Reel by <creator>"). They count as Shorts. Creator and poster come from
  Facebook's embeddable player page (`/plugins/video.php`; oEmbed without a key gives only embed code, the reel
  page answers 400); the poster link expires in days, so a copy is stored as a `data:` URL. Played in Facebook's
  own player, which loads Facebook's scripts on sight (no privacy mode; Daniel accepted) and takes no pause/play
  commands, so Shorts' click layer is left off for reels. Stored with `source = 'facebook'` and the reel id in the
  `youtube_id` column. First reel: "Wombat in the hay" (Josh Neille) in Shorts › Wombat.
- `follow_channel`: by `@handle`, channel link, `UC…` id or a link to one of its videos, or a **playlist** link
  (`youtube.com/playlist?list=…`, deployed 2026-11-02; Daniel hadn't decided whether he wants it, it went out
  with the Facebook change). A playlist's feed lists its first 15 entries in the playlist's own order.
- `list_channels`: latest uploads per channel with "3 days ago" times, Shorts marked `[Short]` ("what's new from my
  channels?").
There is **no delete, rename, move or unfollow**: the tool list is the guard. Not decided yet: a tool to move a
video from To Watch to Saved, and unfollowing.

**The skill: `.claude/skills/add-to-couch/SKILL.md`** (2026-11-02, Daniel's request; for the talk's "MCP, then
Skills" step). Plain English: before adding, list every page and look for the same video; if it's already in Saved,
or elsewhere, say where and ask before saving it twice; then pick the playlist and add it. Hard rules stay in the
server; the skill holds the judgment. It loads in Claude Code sessions started in `mcp-demo/`.
Measured 2026-11-02 (Claude Code 2.1.316, Opus 5.5, headless, one run each, adding switched off so nothing changed):
*"Add https://www.youtube.com/watch?v=uWnUnMphmPM to my Claude playlist on To Watch in Couch"* (that video is
already in Saved › AI). **With the skill:** Claude picked `add-to-couch` on its own, listed all pages, found it in
Saved › AI and asked "Do you still want a second copy in To Watch › Claude?"; 6.2 s by Claude Code's own count
(12.1 s wall, including start-up and a 3 s wait for input), about US$0.26. **Without it** (same prompt from a folder
without the skill): Claude listed only the To Watch page, said the video "isn't one of them yet", and went to add
it, which failed only because adding was switched off; 7.5 s.

**Checking channels** (`server/src/channels.ts`): a channel's RSS feed is asked at most every 30 minutes, only
when the page is open (it asks the server every 10 minutes) or Claude calls `list_channels`. Feeds are shared
between users. Uploads not seen before get the "New" badge and a toast; the first check after following doesn't
count as new. The channel page (`youtube.com/@handle`) is fetched once, at follow time, for the id, name and
avatar; the avatar is stored as a `data:` URL, because YouTube's avatar host sometimes answers the page's image
request with a 429 error page that the browser blocks (seen 2026-11-02).

**Live updates.** Every tool that changes something tells open pages (server-sent events, `/api/events`); the page
refetches, jumps to the page where the change landed, shows a "New" badge and glow on the new cards, and a toast
("Claude added 2 videos to Blender"). This is the stage moment.

## How it's built

Reused from Daniel's online phrasebook (`C:\repos\personal\japanese-phrase-book`; design in its
`docs/superpowers/specs/2026-08-22-remote-mcp-connector-design.md`): Fastify on Railway with Postgres; Google
sign-in limited by `ALLOWED_EMAILS`; its own OAuth 2.1 server (dynamic client registration, PKCE S256, the `401` +
`WWW-Authenticate` discovery handshake) so the same Google login authorises Claude; MCP over Streamable HTTP at
`POST /mcp`. Copied files kept their tests; `routes/auth.ts`, `routes/oauth.ts`, `routes/mcp.ts`, `oauth/*`,
`session.ts`, `google.ts`, `allowlist.ts` are the phrasebook's with names and wording changed.

| Path | What it is |
|---|---|
| `server/src/index.ts` | Startup: config, database, wiring |
| `server/src/db.ts`, `schema.sql` | Postgres (`DATABASE_URL`) or, locally without it, PGlite in `.data/pglite` behind the same interface |
| `server/src/store.ts` | Users, playlists, videos (always scoped to the signed-in user) |
| `server/src/youtube.ts` | Link parsing (watch, youtu.be, shorts, embed, live, bare id) and the oEmbed lookup |
| `server/src/youtubeChannels.ts`, `channels.ts` | Channel links, channel page and feed parsing; following and the 30-minute checks |
| `server/src/mcp/` | Tools, server instructions, JSON-RPC, the 401 challenge |
| `server/src/routes/library.ts` | The page's API: `/api/library`, mark watched, `/api/events`, `/api/config`, local test sign-in |
| `server/src/flow.test.ts` | End to end against PGlite: register → sign in → approve → token → tools → page API |
| `src/` | The Svelte 5 page: `App.svelte` (bar, switcher, hero, toast), `Row.svelte` (any row of cards, from `tiles.ts`), `Player.svelte`, `SignIn.svelte` |
| `shared/protocol.ts` | Types shared by page and server |

**Commands:** `npm install`; `npm test` (247 tests); `npm run check`; `npm run build && npm start` →
http://localhost:8080. Dev with hot reload: `npm run dev:server` and `npm run dev` (Vite on 5173, proxying the server).
Local runs read `.env` (see `.env.example`); `DEV_LOGIN_EMAIL` adds a "Sign in as the local tester" button and is
refused unless `PUBLIC_BASE_URL` is `http://localhost`. Delete `.data/` to start the local database empty. Stop the
local server with Ctrl+C (it closes the database cleanly): once, force-stopping it mid-request left a PGlite folder
that would not open again (`RuntimeError: Aborted()`); deleting `.data/` fixed it. Railway uses real Postgres.

**Deployed** (2026-11-02): Railway project **couch** (workspace "sutantyo's Projects", next to the phrasebook) with
a Postgres database and a service **couch** at **https://couch-test.up.railway.app** (Daniel picked the name;
`couch` itself wouldn't take). Deployed by uploading this folder with the Railway CLI, **not from GitHub**
(`railway up` packs the folder as it is on disk, committed or not): `cd mcp-demo && railway up --service couch --ci`
redeploys. Files git ignores (`.env`,
`.data/`) are not uploaded. Variables: `DATABASE_URL` (reference to Postgres), `SESSION_SECRET` (generated, never
printed), `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS` (Daniel's Google account only), `SECURE_COOKIES=true`,
`PUBLIC_BASE_URL=https://couch-test.up.railway.app`; never `DEV_LOGIN_EMAIL`.
Google: a separate Cloud project **Couch**, OAuth client "Couch web" with JavaScript origins
`https://couch-test.up.railway.app` and `http://localhost:8080`, kept in **Testing** with Daniel as the only test
user (Daniel wants it limited to himself: Google's test-user list and `ALLOWED_EMAILS` are both just him).
Claude connector: `https://couch-test.up.railway.app/mcp`.
Railway warns that `railway.json` (config as code) is deprecated and stops working on 2026-12-01: run
`railway config migrate` before then.

## Checked 2026-11-02

- oEmbed (`https://www.youtube.com/oembed?url=<video link>&format=json`): title, channel, thumbnail, no key.
- Channel RSS (`https://www.youtube.com/feeds/videos.xml?channel_id=<id>`): HTTP 200, 15 latest uploads with
  upload times. Channel pages (`youtube.com/@blenderguru`, `@kurzgesagt`, `@mkbhd`) gave the `UC…` id in
  `<link rel="canonical">`, the name in `og:title`, the avatar in `og:image`; no key.
- Locally, through the MCP tools (a script standing in for Claude's connector): created 4 playlists and added 12 real
  videos; the open page showed a new playlist and video within a second; a video played in the
  `youtube-nocookie.com` player; mark watched worked. Channels: followed Blender Guru, Kurzgesagt and Marques
  Brownlee (by handle, link and video link), then Veritasium while the page was open on To Watch: it jumped to
  Channels with the toast; a made-up handle got "YouTube has no channel at …". Checked in Edge (Chromium) at
  1440 px and 390 px (phone).
  **Not checked:** Safari/WebKit, Railway cold-start timing (Claude allows about 10 s for discovery and tokens).
- **First real run, hosted** (2026-11-02): Claude Code (Opus 5.5) through the `couch` connector (added with
  `claude mcp add --scope user --transport http couch …/mcp`, then authenticated: Google sign-in, Allow). "Add
  4DhcSPkEbwI to To Watch under a Claude playlist": `list_playlists` 6 ms, `create_playlist` 11 ms, `add_videos`
  210 ms on the server (Railway logs); first tool call to video added about 4 s, nearly all of it Claude between
  calls. One run, in a long interactive session; time before the first call not included. Sent to the deck session.
- From Railway, YouTube answers the channel page and feed too: `follow_channel` on `@pepwithchasanddrdave` (Planet
  PEP) resolved the channel and read 15 uploads (2026-11-02).
- The YouTube player's own title bar (top left) can't be hidden; `iv_load_policy=3` turns off its info cards,
  which stacked on top of the title. Nothing of Couch's sits over an ordinary video.
- Telling a Short from a video, no key: `HEAD youtube.com/shorts/<id>` answers 200 for a Short and 303 (to
  `/watch`) for anything else; oEmbed can't tell (same 200x113 for both). Channel feeds link Shorts as
  `/shorts/<id>`, so feed uploads need no extra request. Shorts have a 1080x1920 `oar2.jpg` thumbnail; videos 404.
- Shorts, locally through the MCP tools: a Short into To Watch and a video into Shorts were both refused with the
  reason; the player stepped with ↓, ↑ and the wheel over the video and over the backdrop; a click paused and
  resumed (state read back from the player). Page switcher checked at 360 px and 390 px.

## Background (how we got here, 2026-11-01 and 02)

The brief: a site Daniel changes only by asking Claude; the audience watches it update live. He wants something he
keeps using, as a shareable stand-in for his Azure resource monitor at work, which he can't show.
Sources dropped: Woolworths (blocks scripts: requests hang, headless Chrome gets HTTP 403; no public API), Coles
(a product page answered a plain request on 2026-11-01, but scraping is against their terms and fragile on stage;
Daniel declined), eBay (Browse API is "Limited Release", may need partner approval), Amazon (PA-API retired 2026;
the Creators API needs Associates sales). Free APIs also considered: his GitHub, Transport for NSW, exchange rates,
weather. YouTube won because everyone knows it, it needs no key, and private lists and quiet follows are a real
reason to use it over YouTube's own playlists.

## Open questions for Daniel

- Does this replace the Blender MCP demo in the talk (a sub-section of Claude Code), or sit alongside it?
- The name "Couch" was Claude's placeholder.
- Next tools, if any: move a video to Saved; unfollow a channel; archive instead of delete.
- Shorts are detected when added; a video added before 2026-11-02 has `is_short = false` whatever it is (only
  local test data existed, and it was reset).

## Constraints

- Audience: university students with little to no coding background. Whatever the page shows must make sense to
  them at a glance; the point to land is "Claude is driving this app through MCP, and I chose what it's allowed to do".
- Never run fast pollers against real services: YouTube is only asked when a video is added.
- Every claim or number in the talk must come from something actually run or checked.
- Commit and push only when Daniel asks. No fake GitHub accounts; made-up authors use `.invalid` emails.
