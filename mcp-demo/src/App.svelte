<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type PublicConfig } from './api';
  import SignIn from './SignIn.svelte';
  import Row from './Row.svelte';
  import Player from './Player.svelte';
  import { ago, type Tile } from './tiles';
  import { PAGES, PAGE_TITLES, type Channel, type PageId, type Playlist, type SessionResponse } from '../shared/protocol';

  interface RowModel {
    rowKey: string;
    title: string;
    note: string;
    avatarUrl: string;
    link: string;
    tiles: Tile[];
    emptyText: string;
    tall: boolean;
  }

  const pageFromHash = (): PageId => {
    const id = location.hash.slice(1);
    return (PAGES as readonly string[]).includes(id) ? (id as PageId) : 'watch';
  };

  let config: PublicConfig | null = $state(null);
  let session: SessionResponse | null = $state(null);
  let playlists: Playlist[] = $state([]);
  let channels: Channel[] = $state([]);
  let loaded = $state(false);
  let page: PageId = $state(pageFromHash());
  let fresh = $state(new Set<string>());
  let toast = $state('');
  let playing: { tile: Tile; queue: Tile[] } | null = $state(null);
  let now = $state(Date.now());
  let events: EventSource | null = null;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  function playlistRow(p: Playlist): RowModel {
    return {
      rowKey: p.id,
      title: p.name,
      note: `${p.videos.length} ${p.page === 'shorts' ? 'Short' : 'video'}${p.videos.length === 1 ? '' : 's'}`,
      avatarUrl: '',
      link: '',
      emptyText: `Nothing here yet. Ask Claude: “Add this ${p.page === 'shorts' ? 'Short' : 'video'} to my ${p.name} playlist”`,
      tall: p.page === 'shorts',
      tiles: p.videos.map((v) => ({
        key: v.id,
        youtubeId: v.youtubeId,
        title: v.title,
        sub: v.channel,
        thumbnailUrl: v.thumbnailUrl,
        isShort: v.isShort,
        source: v.source,
        watched: p.page !== 'saved' && v.watchedAt !== null,
        videoId: p.page !== 'saved' ? v.id : undefined,
        context: p.name,
        channel: v.channel
      }))
    };
  }

  /** Where each YouTube video already sits in the playlists, for the tags on channel uploads. */
  const placed = $derived.by(() => {
    const map = new Map<string, { pages: Set<string>; watched: boolean }>();
    for (const p of playlists) {
      for (const v of p.videos) {
        const entry = map.get(v.youtubeId) ?? { pages: new Set<string>(), watched: false };
        entry.pages.add(PAGE_TITLES[p.page]);
        entry.watched ||= v.watchedAt !== null;
        map.set(v.youtubeId, entry);
      }
    }
    return map;
  });

  function placementTag(youtubeId: string): string | undefined {
    const entry = placed.get(youtubeId);
    if (!entry) return undefined;
    return `${entry.watched ? '✓ ' : ''}${[...entry.pages].join(' · ')}`;
  }

  function uploadTile(c: Channel, u: Channel['uploads'][number], sub: string): Tile {
    return {
      key: u.youtubeId,
      youtubeId: u.youtubeId,
      title: u.title,
      sub,
      thumbnailUrl: u.thumbnailUrl,
      isShort: u.isShort,
      source: 'youtube',
      tag: placementTag(u.youtubeId),
      watched: false,
      context: c.title,
      channel: c.title
    };
  }

  /** A channel's ordinary uploads. Its Shorts are on the Shorts page. */
  function channelRow(c: Channel): RowModel {
    return {
      rowKey: `channel:${c.channelId}`,
      title: c.title,
      note:
        (c.kind === 'playlist' ? `playlist${c.owner ? ` by ${c.owner}` : ''} · ` : '') +
        (c.checkedAt ? `checked ${ago(c.checkedAt, now)}` : 'not checked yet'),
      avatarUrl: c.avatarUrl,
      link: c.url,
      emptyText: 'No videos lately, only Shorts. They are on the Shorts page.',
      tall: false,
      tiles: c.uploads.filter((u) => !u.isShort).map((u) => uploadTile(c, u, ago(u.publishedAt, now)))
    };
  }

  /** Every followed channel's Shorts in one row, newest first. */
  const channelShorts = $derived(
    channels
      .flatMap((c) => c.uploads.filter((u) => u.isShort).map((u) => ({ c, u })))
      .sort((a, b) => b.u.publishedAt.localeCompare(a.u.publishedAt))
      .map(({ c, u }) => uploadTile(c, u, `${c.title} · ${ago(u.publishedAt, now)}`))
  );

  const rows = $derived.by((): RowModel[] => {
    if (page === 'channels') return channels.map(channelRow);
    const lists = playlists.filter((p) => p.page === page).map(playlistRow);
    if (page !== 'shorts' || channelShorts.length === 0) return lists;
    return [
      ...lists,
      {
        rowKey: 'channel-shorts',
        title: 'From your channels',
        note: `${channelShorts.length} Short${channelShorts.length === 1 ? '' : 's'}`,
        avatarUrl: '',
        link: '',
        emptyText: '',
        tall: true,
        tiles: channelShorts
      }
    ];
  });

  function play(tile: Tile, queue: Tile[] = []) {
    playing = { tile, queue };
  }

  /** The hero: the newest thing on this page (on To Watch, the newest not yet watched). Shorts have none. */
  const featured = $derived.by((): { tile: Tile; eyebrow: string } | null => {
    if (page === 'shorts') return null;
    if (page === 'channels') {
      const all = channels.flatMap((c) => c.uploads.filter((u) => !u.isShort).map((u) => ({ c, u })));
      const top = all.sort((a, b) => b.u.publishedAt.localeCompare(a.u.publishedAt))[0];
      if (!top) return null;
      const tile = channelRow(top.c).tiles.find((t) => t.key === top.u.youtubeId)!;
      return { tile, eyebrow: `New from ${top.c.title} · ${ago(top.u.publishedAt, now)}` };
    }
    const all = playlists
      .filter((p) => p.page === page)
      .flatMap((p) => p.videos.map((v) => ({ p, v })));
    const pool = page === 'watch' ? all.filter((e) => e.v.watchedAt === null) : all;
    const top = (pool.length > 0 ? pool : all).sort((a, b) => b.v.addedAt.localeCompare(a.v.addedAt))[0];
    if (!top) return null;
    const tile = playlistRow(top.p).tiles.find((t) => t.key === top.v.id)!;
    return { tile, eyebrow: `${page === 'watch' ? 'Up next' : 'From your collection'} · ${top.p.name}` };
  });

  const counts = $derived({
    watch: playlists.filter((p) => p.page === 'watch').reduce((n, p) => n + p.videos.length, 0),
    saved: playlists.filter((p) => p.page === 'saved').reduce((n, p) => n + p.videos.length, 0),
    channels: channels.length,
    shorts: playlists.filter((p) => p.page === 'shorts').reduce((n, p) => n + p.videos.length, 0) + channelShorts.length
  } satisfies Record<PageId, number>);

  async function start() {
    config = await api.config();
    session = await api.session();
    if (session.signedIn) await enter();
  }

  async function enter() {
    session = await api.session();
    await refresh();
    loaded = true;
    listen();
  }

  async function refresh(highlight: string[] = []) {
    const before = new Set([
      ...playlists.flatMap((p) => [p.id, ...p.videos.map((v) => v.id)]),
      ...channels.flatMap((c) => [`channel:${c.channelId}`, ...c.uploads.map((u) => u.youtubeId)])
    ]);
    const library = await api.library();
    playlists = library.playlists;
    channels = library.channels;
    if (highlight.length === 0) return;

    // Jump to the page where the new things landed, so the audience sees them arrive.
    const inPlaylist = playlists.find((p) => highlight.includes(p.id) || p.videos.some((v) => highlight.includes(v.id)));
    const inChannels = channels.some(
      (c) => highlight.includes(`channel:${c.channelId}`) || c.uploads.some((u) => !u.isShort && highlight.includes(u.youtubeId))
    );
    const inShorts = channels.some((c) => c.uploads.some((u) => u.isShort && highlight.includes(u.youtubeId)));
    const landed: PageId | null = inPlaylist ? inPlaylist.page : inChannels ? 'channels' : inShorts ? 'shorts' : null;
    if (landed && landed !== page) switchTo(landed);

    fresh = new Set([...fresh, ...highlight]);
    setTimeout(() => {
      fresh = new Set([...fresh].filter((id) => !highlight.includes(id)));
    }, 6000);

    const isNew = (key: string) => highlight.includes(key) && !before.has(key);
    const newLists = playlists.filter((p) => isNew(p.id));
    const newVideos = playlists.flatMap((p) => p.videos.filter((v) => isNew(v.id)).map(() => p.name));
    const newChannels = channels.filter((c) => isNew(`channel:${c.channelId}`));
    const newUploads = channels.flatMap((c) => c.uploads.filter((u) => isNew(u.youtubeId)).map((u) => ({ c, u })));
    if (newLists.length > 0) say(`Claude made a new playlist: ${newLists.map((p) => p.name).join(', ')}`);
    else if (newVideos.length > 0)
      say(`Claude added ${newVideos.length} video${newVideos.length === 1 ? '' : 's'} to ${[...new Set(newVideos)].join(', ')}`);
    else if (newChannels.length > 0) say(`Now following ${newChannels.map((c) => c.title).join(', ')}`);
    else if (newUploads.length === 1)
      say(`New ${newUploads[0].u.isShort ? 'Short' : 'video'} from ${newUploads[0].c.title}: ${newUploads[0].u.title}`);
    else if (newUploads.length > 1) say(`${newUploads.length} new uploads from your channels`);
  }

  function listen() {
    events?.close();
    events = new EventSource('/api/events');
    events.addEventListener('change', (event) => {
      const change = JSON.parse((event as MessageEvent).data) as { highlight: string[] };
      void refresh(change.highlight);
    });
    // After a dropped connection, catch up on anything missed while away.
    events.addEventListener('open', () => void refresh());
  }

  function say(message: string) {
    toast = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 4500);
  }

  function switchTo(next: PageId) {
    page = next;
    history.replaceState(null, '', next === 'watch' ? '#' : `#${next}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function toggleWatched(tile: Tile) {
    if (!tile.videoId) return;
    const updated = await api.setWatched(tile.videoId, !tile.watched);
    playlists = playlists.map((p) => ({ ...p, videos: p.videos.map((v) => (v.id === updated.id ? updated : v)) }));
    if (playing && playing.tile.videoId === updated.id) {
      playing = { ...playing, tile: { ...playing.tile, watched: updated.watchedAt !== null } };
    }
  }

  async function signOut() {
    events?.close();
    await api.signOut();
    session = { signedIn: false, userId: null, email: null, name: null };
    playlists = [];
    channels = [];
    loaded = false;
  }

  onMount(() => {
    void start();
    // Times ("3 hours ago") tick over each minute. Every 10 minutes the page asks
    // again, which lets the server check channels that are due (at most every 30).
    const clock = setInterval(() => (now = Date.now()), 60_000);
    const poll = setInterval(() => {
      if (loaded && document.visibilityState === 'visible') void refresh();
    }, 10 * 60_000);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
      events?.close();
    };
  });
</script>

{#if config === null || session === null}
  <div class="splash" aria-busy="true"><span class="brand">COUCH</span></div>
{:else if !session.signedIn}
  <SignIn {config} onSignedIn={enter} />
{:else}
  <header class="bar">
    <span class="brand">COUCH</span>
    <nav class="switcher" aria-label="Pages">
      {#each PAGES as id}
        <button class:active={page === id} aria-current={page === id ? 'page' : undefined} onclick={() => switchTo(id)}>
          {PAGE_TITLES[id]}
          <span class="pill">{counts[id]}</span>
        </button>
      {/each}
    </nav>
    <button class="who" onclick={signOut} title="Sign out">{(session.name || session.email || '?').slice(0, 1).toUpperCase()}</button>
  </header>

  {#if loaded}
    {#key page}
      <main class="page">
        {#if featured}
          <section class="hero">
            <!-- Thumbnails top out at 1280x720, so the full-width background is the
                 same image blurred (nothing to pixelate), and the sharp copy is a
                 card no wider than it can be shown crisply. -->
            <img class="backdrop" src={`https://i.ytimg.com/vi/${featured.tile.youtubeId}/hqdefault.jpg`} alt="" />
            <div class="shade"></div>
            <button class="poster" aria-label={`Play ${featured.tile.title}`} onclick={() => play(featured.tile)}>
              <img src={`https://i.ytimg.com/vi/${featured.tile.youtubeId}/maxresdefault.jpg`} alt=""
                onerror={(e) => ((e.currentTarget as HTMLImageElement).src = `https://i.ytimg.com/vi/${featured.tile.youtubeId}/hqdefault.jpg`)} />
              <span class="poster-play" aria-hidden="true">▶</span>
            </button>
            <div class="copy">
              <p class="eyebrow">{featured.eyebrow}</p>
              <h1>{featured.tile.title}</h1>
              <p class="channel">{featured.tile.channel}</p>
              <div class="cta">
                <button class="play" onclick={() => play(featured.tile)}>▶ Play</button>
                {#if featured.tile.videoId}
                  <button class="ghost" onclick={() => toggleWatched(featured.tile)}>
                    {featured.tile.watched ? '✓ Watched' : 'Mark watched'}
                  </button>
                {/if}
              </div>
            </div>
          </section>
        {:else if page === 'shorts'}
          <section class="shorts-head">
            <h1>Shorts</h1>
            {#if rows.length > 0 && rows.some((r) => r.tiles.length > 0)}
              <button class="play" onclick={() => { const r = rows.find((r) => r.tiles.length > 0)!; play(r.tiles[0], r.tiles); }}>
                ▶ Play from the top
              </button>
            {/if}
            {#if rows.length === 0}
              <p class="channel">
                Shorts live only on this page. Ask Claude: <q>Make a Funny playlist on my Shorts page and add this Short</q>,
                or follow a channel: its Shorts show up here.
              </p>
            {:else}
              <p class="channel">↑ ↓, the mouse wheel or a swipe moves through Shorts in the player.</p>
            {/if}
          </section>
        {:else}
          <section class="hero empty">
            <div class="copy">
              <p class="eyebrow">{PAGE_TITLES[page]}</p>
              <h1>
                {page === 'watch' ? 'Nothing queued up yet' : page === 'saved' ? 'Nothing saved yet' : 'No channels yet'}
              </h1>
              <p class="channel">
                This page only changes when you ask Claude. Try:
                <q>{page === 'watch'
                  ? 'Make a Blender playlist on my To Watch page and add this video'
                  : page === 'saved'
                    ? 'Save this video in a Favourites playlist on my Saved page'
                    : 'Follow @blenderguru quietly'}</q>
              </p>
            </div>
          </section>
        {/if}

        <div class="rows">
          {#each rows as row (row.rowKey)}
            <Row {...row} {fresh} onPlay={(tile) => play(tile, row.tiles)} />
          {/each}
        </div>
      </main>
    {/key}
  {/if}

  {#if playing}
    <Player
      tile={playing.tile}
      queue={playing.queue}
      onNavigate={(tile) => playing && (playing = { ...playing, tile })}
      onClose={() => (playing = null)}
      onToggleWatched={toggleWatched}
    />
  {/if}

  <div class="toast" class:show={toast !== ''} role="status" aria-live="polite">
    <span class="spark">✦</span>{toast}
  </div>
{/if}

<style>
  .splash {
    min-height: 100vh;
    display: grid;
    place-items: center;
  }
  .brand {
    font-weight: 800;
    letter-spacing: 0.12em;
    color: var(--accent);
    font-size: 26px;
  }
  .bar {
    position: fixed;
    inset: 0 0 auto;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: clamp(16px, 3vw, 40px);
    padding: 14px var(--gutter);
    background: linear-gradient(to bottom, rgba(15, 15, 16, 0.92), rgba(15, 15, 16, 0));
  }
  .switcher {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 999px;
    background: rgba(27, 27, 29, 0.75);
    backdrop-filter: blur(8px);
  }
  .switcher button {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 0;
    border-radius: 999px;
    padding: 8px 16px;
    background: transparent;
    color: var(--ink-dim);
    font-weight: 600;
    font-size: 15px;
    transition: background 0.2s, color 0.2s;
  }
  .switcher button:hover {
    color: var(--ink);
  }
  .switcher button.active {
    background: var(--ink);
    color: var(--bg);
  }
  .pill {
    min-width: 22px;
    padding: 1px 7px;
    border-radius: 999px;
    background: rgba(127, 127, 127, 0.25);
    font-size: 12px;
  }
  .who {
    margin-left: auto;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 6px;
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 700;
  }
  .page {
    animation: fade 0.35s var(--ease);
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  /*
    A compact strip: the thumbnail at a size it can be shown sharply (YouTube's
    largest is 1280x720), the words beside it, wrapping freely. Short, so the
    playlists start high on the page.
  */
  .hero {
    position: relative;
    display: grid;
    grid-template-columns: clamp(390px, 45vw, 720px) minmax(0, 1fr);
    grid-template-areas: 'poster copy';
    align-items: center;
    column-gap: clamp(20px, 3vw, 44px);
    padding: 96px var(--gutter) clamp(28px, 4vw, 48px);
    overflow: hidden;
  }
  .hero .copy {
    grid-area: copy;
    max-width: 900px;
  }
  .hero .copy h1 {
    font-size: clamp(24px, 2.6vw, 40px);
    line-height: 1.12;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .hero:not(.empty) + .rows {
    margin-top: 0;
  }
  .poster {
    grid-area: poster;
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    padding: 0;
    border: 0;
    border-radius: 12px;
    overflow: hidden;
    background: #000;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.06);
    transition: transform 0.3s var(--ease);
  }
  .poster:hover {
    transform: scale(1.02);
  }
  .poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .poster-play {
    position: absolute;
    inset: 0;
    margin: auto;
    width: 76px;
    height: 76px;
    display: grid;
    place-items: center;
    padding-left: 6px;
    border-radius: 50%;
    background: rgba(15, 15, 16, 0.6);
    font-size: 30px;
    opacity: 0;
    transition: opacity 0.25s;
  }
  .poster:hover .poster-play,
  .poster:focus-visible .poster-play {
    opacity: 1;
  }
  @media (max-width: 760px) {
    .hero {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'poster' 'copy';
      row-gap: 16px;
      padding-top: 84px;
    }
  }
  .shorts-head {
    padding: 110px var(--gutter) 8px;
    background: radial-gradient(ellipse at 15% 0%, rgba(229, 72, 77, 0.2), transparent 55%);
  }
  .shorts-head h1 {
    margin-bottom: 12px;
  }
  .shorts-head .play {
    margin-bottom: 14px;
  }
  .shorts-head + .rows {
    margin-top: 0;
  }
  .hero.empty {
    min-height: 52vh;
    background: radial-gradient(ellipse at 20% 0%, rgba(229, 72, 77, 0.22), transparent 60%);
  }
  /* Ambient colour from the video: blurred, so its low resolution never shows. */
  .backdrop {
    position: absolute;
    inset: -10%;
    width: 120%;
    height: 120%;
    object-fit: cover;
    filter: blur(60px) saturate(1.3) brightness(0.55);
  }
  .shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, rgba(15, 15, 16, 0.85) 0%, rgba(15, 15, 16, 0.35) 55%, rgba(15, 15, 16, 0.15) 100%),
      linear-gradient(to top, var(--bg) 0%, transparent 45%);
  }
  .copy {
    position: relative;
    max-width: min(640px, 100%);
  }
  .eyebrow {
    margin: 0 0 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 13px;
    font-weight: 600;
    color: var(--glow);
  }
  h1 {
    margin: 0 0 8px;
    font-size: clamp(28px, 4vw, 54px);
    line-height: 1.05;
    font-weight: 700;
    text-wrap: balance;
  }
  .channel {
    margin: 0 0 22px;
    color: var(--ink-dim);
    font-size: 18px;
  }
  .channel q {
    color: var(--ink);
  }
  .cta {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .play,
  .ghost {
    border: 0;
    border-radius: 4px;
    padding: 12px 26px;
    font-size: 17px;
    font-weight: 700;
  }
  .play {
    background: var(--ink);
    color: var(--bg);
  }
  .ghost {
    background: rgba(110, 110, 115, 0.55);
  }
  .play:hover,
  .ghost:hover {
    filter: brightness(0.88);
  }
  .rows {
    position: relative;
    margin-top: clamp(-80px, -6vw, -20px);
    padding-bottom: 80px;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
  }
  .toast {
    position: fixed;
    left: 50%;
    bottom: 28px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: calc(100vw - 32px);
    padding: 14px 22px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--bg);
    font-weight: 600;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    transform: translate(-50%, 140%);
    transition: transform 0.4s var(--ease);
  }
  .toast.show {
    transform: translate(-50%, 0);
  }
  .spark {
    color: var(--accent);
  }
  .switcher button {
    white-space: nowrap;
  }
  @media (max-width: 560px) {
    .bar {
      gap: 10px;
    }
    .bar .brand,
    .pill {
      display: none;
    }
    .switcher {
      gap: 0;
      padding: 3px;
    }
    .switcher button {
      padding: 7px 10px;
      font-size: 14px;
    }
  }
</style>
