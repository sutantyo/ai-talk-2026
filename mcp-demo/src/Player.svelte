<script lang="ts">
  import { onMount } from 'svelte';
  import type { Tile } from './tiles';

  let {
    tile,
    queue = [],
    onNavigate,
    onClose,
    onToggleWatched
  }: {
    tile: Tile;
    /** The row it was opened from: Shorts step through it, TikTok-style. */
    queue?: Tile[];
    onNavigate?: (tile: Tile) => void;
    onClose: () => void;
    onToggleWatched: (tile: Tile) => void;
  } = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let frame: HTMLIFrameElement | undefined = $state();
  /** Reported by the YouTube player itself (1 = playing); see onMessage. */
  let playing = $state(false);
  const index = $derived(queue.findIndex((t) => t.key === tile.key));
  const canStep = $derived(tile.isShort && queue.length > 1 && index >= 0);
  let lastStep = 0;
  let touchY: number | null = null;

  function step(direction: 1 | -1) {
    if (!canStep || !onNavigate) return;
    const now = Date.now();
    if (now - lastStep < 450) return; // one wheel flick is many wheel events
    lastStep = now;
    const next = queue[index + direction];
    if (next) onNavigate(next);
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      step(-1);
    }
  }

  function onWheel(event: WheelEvent) {
    if (canStep && Math.abs(event.deltaY) > 20) step(event.deltaY > 0 ? 1 : -1);
  }

  /**
   * The YouTube player is its own page inside ours, so it swallows clicks, keys
   * and wheel scrolls. For Shorts, a clear layer over the video catches them
   * instead, and a click pauses or plays through YouTube's IFrame API messages
   * (enablejsapi=1). The player reports its state back, so a click always does
   * the right thing even when the browser blocked autoplay.
   */
  function command(func: 'playVideo' | 'pauseVideo') {
    frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
  }

  function togglePlay() {
    command(playing ? 'pauseVideo' : 'playVideo');
  }

  function startListening() {
    playing = false;
    frame?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
  }

  function onMessage(event: MessageEvent) {
    if (event.source !== frame?.contentWindow) return;
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      const state = data?.info?.playerState ?? (data?.event === 'onStateChange' ? data.info : undefined);
      if (typeof state === 'number') playing = state === 1 || state === 3;
    } catch {
      // Not a player message.
    }
  }

  onMount(() => {
    dialog?.showModal();
    // The page behind must not scroll while the player is open.
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    // On the window, so a scroll over the dark backdrop counts too.
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('message', onMessage);
      document.documentElement.style.overflow = overflow;
    };
  });

  // Privacy-enhanced mode: YouTube sets no cookies until the video plays.
  const src = $derived(
    `https://www.youtube-nocookie.com/embed/${tile.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1` +
      `&origin=${encodeURIComponent(location.origin)}`
  );
</script>

<dialog
  bind:this={dialog}
  class:vertical={tile.isShort}
  onkeydown={onKey}
  ontouchstart={(e) => (touchY = e.touches[0].clientY)}
  ontouchend={(e) => {
    if (touchY !== null) {
      const dy = touchY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 60) step(dy > 0 ? 1 : -1);
    }
    touchY = null;
  }}
  onclose={onClose}
  onclick={(event) => {
    if (event.target === dialog) dialog?.close();
  }}
>
  {#if canStep}
    <div class="stepper">
      <button aria-label="Previous Short" disabled={index === 0} onclick={() => step(-1)}>↑</button>
      <span>{index + 1} / {queue.length}</span>
      <button aria-label="Next Short" disabled={index === queue.length - 1} onclick={() => step(1)}>↓</button>
    </div>
  {/if}
  <div class="frame">
    {#key tile.youtubeId}
    <iframe
      bind:this={frame}
      onload={startListening}
      {src}
      title={tile.title}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
    {/key}
    {#if tile.isShort}
      <button class="catcher" aria-label={playing ? 'Pause' : 'Play'} onclick={togglePlay}>
        {#if !playing}<span class="paused" aria-hidden="true">▶</span>{/if}
      </button>
    {/if}
  </div>
  <div class="details">
    <div>
      <h2>{tile.title}</h2>
      <p>{tile.channel}{#if tile.context !== tile.channel} · in <strong>{tile.context}</strong>{/if}</p>
    </div>
    <div class="actions">
      {#if tile.videoId}
        <button class="watched" class:on={tile.watched} onclick={() => onToggleWatched(tile)}>
          {tile.watched ? '✓ Watched' : 'Mark watched'}
        </button>
      {/if}
      <a class="youtube" href={`https://www.youtube.com/watch?v=${tile.youtubeId}`} target="_blank" rel="noreferrer">
        Open on YouTube
      </a>
      <button class="close" aria-label="Close" onclick={() => dialog?.close()}>✕</button>
    </div>
  </div>
</dialog>

<style>
  dialog {
    width: min(1100px, calc(100vw - 32px));
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: var(--bg-raised);
    color: var(--ink);
    overflow: hidden;
  }
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.8);
  }
  dialog[open] {
    animation: open 0.3s var(--ease);
  }
  @keyframes open {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.97);
    }
  }
  .frame {
    aspect-ratio: 16 / 9;
    background: #000;
  }
  /* Shorts: a tall phone-shaped player, as high as the screen allows. */
  dialog.vertical {
    width: min(calc((100vh - 170px) * 9 / 16), calc(100vw - 32px));
    overflow: visible;
    background: transparent;
  }
  dialog.vertical::backdrop {
    background: rgba(0, 0, 0, 0.94);
  }
  dialog.vertical .frame {
    position: relative;
    aspect-ratio: 9 / 16;
    border-radius: 14px;
    overflow: hidden;
  }
  /* Covers the video except YouTube's control bar at the bottom. */
  .catcher {
    position: absolute;
    inset: 0 0 64px 0;
    border: 0;
    padding: 0;
    background: transparent;
    display: grid;
    place-items: center;
  }
  .paused {
    width: 72px;
    height: 72px;
    display: grid;
    place-items: center;
    padding-left: 6px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.55);
    font-size: 30px;
    color: #fff;
  }
  dialog.vertical .details {
    flex-direction: column;
    align-items: stretch;
    padding: 12px 2px 0;
  }
  dialog.vertical h2 {
    font-size: 16px;
  }
  dialog.vertical .actions {
    justify-content: space-between;
  }
  .stepper {
    position: absolute;
    top: 50%;
    right: -68px;
    transform: translateY(-50%);
    display: grid;
    gap: 10px;
    justify-items: center;
    color: var(--ink-dim);
    font-size: 13px;
  }
  .stepper button {
    width: 48px;
    height: 48px;
    border: 0;
    border-radius: 50%;
    background: var(--bg-hover);
    font-size: 20px;
  }
  .stepper button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  @media (max-width: 640px) {
    .stepper {
      display: none;
    }
  }
  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
  .details {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: space-between;
    align-items: center;
    padding: 18px 22px 22px;
  }
  h2 {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 600;
  }
  p {
    margin: 0;
    color: var(--ink-dim);
  }
  p strong {
    color: var(--ink);
    font-weight: 500;
  }
  .actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .watched,
  .youtube {
    border: 0;
    border-radius: 4px;
    padding: 10px 16px;
    font-weight: 600;
    text-decoration: none;
    font-size: 15px;
  }
  .watched {
    background: var(--ink);
    color: var(--bg);
  }
  .watched.on {
    background: var(--accent);
    color: var(--accent-ink);
  }
  .youtube {
    background: var(--bg-hover);
    color: var(--ink);
  }
  .close {
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 50%;
    background: var(--bg-hover);
  }
</style>
