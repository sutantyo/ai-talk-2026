<script lang="ts">
  import type { Tile } from './tiles';

  let {
    rowKey,
    title,
    note = '',
    avatarUrl = '',
    link = '',
    tiles,
    fresh,
    emptyText,
    tall = false,
    onPlay
  }: {
    rowKey: string;
    title: string;
    note?: string;
    avatarUrl?: string;
    link?: string;
    tiles: Tile[];
    fresh: Set<string>;
    emptyText: string;
    /** 9:16 cards, for Shorts. */
    tall?: boolean;
    onPlay: (tile: Tile) => void;
  } = $props();

  let track: HTMLDivElement | undefined = $state();
  let atStart = $state(true);
  let atEnd = $state(true);

  function measure() {
    if (!track) return;
    atStart = track.scrollLeft < 8;
    atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
  }

  function scrollBy(direction: 1 | -1) {
    track?.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
  }

  $effect(() => {
    void tiles.length;
    queueMicrotask(measure);
  });
</script>

<section class="row" class:fresh={fresh.has(rowKey)} class:tall aria-label={title}>
  <h2>
    {#if avatarUrl}
      <img class="avatar" src={avatarUrl} alt="" />
    {:else if link}
      <span class="avatar initial" aria-hidden="true">{title.slice(0, 1)}</span>
    {/if}
    {#if link}
      <a href={link} target="_blank" rel="noreferrer">{title}</a>
    {:else}
      {title}
    {/if}
    <span class="note">{note}</span>
  </h2>

  {#if tiles.length === 0}
    <div class="empty"><p>{emptyText}</p></div>
  {:else}
    <div class="viewport">
      {#if !atStart}
        <button class="nudge left" aria-label="Scroll left" onclick={() => scrollBy(-1)}>‹</button>
      {/if}
      <div class="track" bind:this={track} onscroll={measure}>
        {#each tiles as tile (tile.key)}
          <button class="card" class:watched={tile.watched} class:fresh={fresh.has(tile.key)} onclick={() => onPlay(tile)}>
            <div class="thumb">
              <img src={tile.thumbnailUrl} alt="" loading="lazy" />
              {#if fresh.has(tile.key)}<span class="badge">New</span>{/if}
              {#if tile.tag}<span class="tag" title="Already in your playlists">{tile.tag}</span>{/if}
              {#if tile.source === 'facebook'}<span class="source" title="From Facebook">f</span>{/if}
              {#if tile.watched}
                <span class="tick" aria-label="Watched">✓</span>
                <span class="progress"></span>
              {/if}
            </div>
            <div class="meta">
              <span class="title">{tile.title}</span>
              <span class="sub">{tile.sub}</span>
            </div>
          </button>
        {/each}
      </div>
      {#if !atEnd}
        <button class="nudge right" aria-label="Scroll right" onclick={() => scrollBy(1)}>›</button>
      {/if}
    </div>
  {/if}
</section>

<style>
  .row {
    padding: 14px 0 6px;
    border-radius: 8px;
  }
  .row.fresh {
    animation: row-arrive 2.4s var(--ease);
  }
  @keyframes row-arrive {
    0% {
      opacity: 0;
      transform: translateY(16px);
    }
    20% {
      opacity: 1;
      transform: none;
      background: rgba(255, 178, 36, 0.1);
    }
    100% {
      background: transparent;
    }
  }
  h2 {
    margin: 0 var(--gutter) 10px;
    font-size: clamp(18px, 1.6vw, 24px);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  h2 a {
    color: inherit;
    text-decoration: none;
  }
  h2 a:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--bg-raised);
  }
  .initial {
    display: grid;
    place-items: center;
    font-size: 15px;
    font-weight: 700;
    color: var(--ink-dim);
  }
  .note {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-faint);
  }
  .empty {
    margin: 0 var(--gutter);
    padding: 22px 20px;
    border: 1px dashed var(--rule);
    border-radius: var(--radius);
    color: var(--ink-dim);
  }
  .empty p {
    margin: 0;
  }
  .viewport {
    position: relative;
  }
  .track {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scroll-padding: 0 var(--gutter);
    padding: 8px var(--gutter) 18px;
    scrollbar-width: none;
  }
  .track::-webkit-scrollbar {
    display: none;
  }
  .card {
    flex: 0 0 var(--card-w);
    display: flex;
    flex-direction: column;
    scroll-snap-align: start;
    padding: 0;
    border: 0;
    background: none;
    text-align: left;
    transition: transform 0.25s var(--ease);
  }
  .tall .card {
    flex-basis: var(--short-w);
  }
  .tall .thumb {
    aspect-ratio: 9 / 16;
    border-radius: 10px;
  }
  .card:hover,
  .card:focus-visible {
    transform: scale(1.05);
    z-index: 2;
  }
  .thumb {
    position: relative;
    aspect-ratio: 16 / 9;
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--bg-raised);
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: filter 0.25s;
  }
  .card.watched .thumb img {
    filter: brightness(0.55) saturate(0.6);
  }
  .card.fresh .thumb {
    animation: card-glow 2.6s var(--ease);
  }
  @keyframes card-glow {
    0% {
      box-shadow: 0 0 0 0 var(--glow);
      transform: scale(0.85);
      opacity: 0;
    }
    25% {
      box-shadow: 0 0 0 3px var(--glow), 0 0 28px 4px rgba(255, 178, 36, 0.45);
      transform: none;
      opacity: 1;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }
  .badge {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 2px 8px;
    border-radius: 3px;
    background: var(--glow);
    color: #1a1204;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .tag {
    position: absolute;
    left: 8px;
    bottom: 8px;
    max-width: calc(100% - 16px);
    padding: 2px 8px;
    border-radius: 3px;
    background: rgba(15, 15, 16, 0.82);
    color: var(--ink);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .source {
    position: absolute;
    right: 8px;
    bottom: 8px;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #1877f2;
    color: #fff;
    font: 800 14px/1 ui-sans-serif, system-ui, sans-serif;
  }
  .tick {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(15, 15, 16, 0.8);
    font-size: 14px;
  }
  .progress {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 4px;
    background: var(--accent);
  }
  .meta {
    display: grid;
    gap: 2px;
    padding: 8px 2px 0;
  }
  .title {
    font-size: 15px;
    font-weight: 500;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .sub {
    font-size: 13px;
    color: var(--ink-dim);
  }
  .nudge {
    position: absolute;
    top: 8px;
    bottom: 18px;
    width: calc(var(--gutter) - 6px);
    min-width: 36px;
    max-width: 64px;
    z-index: 3;
    border: 0;
    background: rgba(15, 15, 16, 0.7);
    font-size: 40px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .viewport:hover .nudge,
  .nudge:focus-visible {
    opacity: 1;
  }
  .nudge.left {
    left: 0;
    border-radius: 0 var(--radius) var(--radius) 0;
  }
  .nudge.right {
    right: 0;
    border-radius: var(--radius) 0 0 var(--radius);
  }
  @media (hover: none) {
    .nudge {
      display: none;
    }
  }
</style>
