<script setup lang="ts">
// Beyond Coding's list, as a 60s comic splash page: each part of the job is a two-layer comic burst (an outer shape,
// a differently shaped inner one with halftone dots), popping in one after another over a sunburst of rays.
type Kind = 'spike' | 'jag' | 'cloud'
const BURSTS: { text: string, x: number, y: number, w: number, rot: number, kind: Kind, outer: string, inner: string, ink: string }[] = [
  { text: 'Source Control', x: 250, y: 140, w: 360, rot: -7, kind: 'jag', outer: '#1f5fbf', inner: '#ffd400', ink: '#e4202a' },
  { text: 'Testing', x: 730, y: 130, w: 280, rot: 6, kind: 'cloud', outer: '#1f5fbf', inner: '#ffffff', ink: '#ff6a00' },
  { text: 'Monitoring', x: 525, y: 290, w: 370, rot: -3, kind: 'spike', outer: '#ffd400', inner: '#e4202a', ink: '#ffd400' },
  { text: 'Documentation', x: 240, y: 418, w: 420, rot: 5, kind: 'jag', outer: '#e4202a', inner: '#ffffff', ink: '#1f5fbf' },
  { text: 'Learning', x: 755, y: 425, w: 300, rot: -8, kind: 'spike', outer: '#1f5fbf', inner: '#ffd400', ink: '#e4202a' },
]

// Shapes in a 100 x 100 box. `seed` varies the spikes so no two bursts look alike.
function star(n: number, inner: number, wobble: number, seed: number) {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + seed
    const jitter = (((i + 1) * (seed * 97 + 31)) % 11) / 10 * wobble
    const r = i % 2 ? inner + jitter * 0.5 : 1 - jitter
    pts.push(`${(50 + 50 * r * Math.cos(a)).toFixed(1)},${(50 + 50 * r * Math.sin(a)).toFixed(1)}`)
  }
  return `M${pts.join(' L')} Z`
}
// A puffy cloud: arcs bulging out between points on an ellipse.
function cloud(n: number, scale = 1) {
  const p = (i: number) => {
    const a = (i / n) * Math.PI * 2
    return [50 + 44 * scale * Math.cos(a), 50 + 40 * scale * Math.sin(a)]
  }
  let d = `M${p(0).join(',')}`
  for (let i = 1; i <= n; i++) d += ` A ${11 * scale} ${11 * scale} 0 0 1 ${p(i).map(v => v.toFixed(1)).join(',')}`
  return d + ' Z'
}
function shapes(kind: Kind, i: number) {
  if (kind === 'cloud') return { outer: star(14, 0.72, 0.12, i + 1), inner: cloud(9, 0.82) }
  if (kind === 'jag') return { outer: star(9, 0.6, 0.18, i + 2), inner: star(11, 0.7, 0.14, i + 5) }
  return { outer: star(16, 0.66, 0.16, i + 3), inner: star(13, 0.72, 0.12, i + 7) }
}
</script>

<template>
  <div class="comic">
    <div v-for="(b, i) in BURSTS" :key="b.text" class="burst"
      :style="{ left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', '--rot': b.rot + 'deg', animationDelay: (0.2 + i * 0.35) + 's' }">
      <svg viewBox="-6 -6 112 112" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern :id="'dots' + i" width="3.2" height="3.2" patternUnits="userSpaceOnUse">
            <circle cx="1.6" cy="1.6" r="0.75" fill="#000" opacity="0.18" />
          </pattern>
        </defs>
        <path :d="shapes(b.kind, i).outer" :fill="b.outer" stroke="#111" stroke-width="1.6" stroke-linejoin="round" />
        <g transform="translate(50 50) scale(0.8) translate(-50 -50)">
          <path :d="shapes(b.kind, i).inner" :fill="b.inner" stroke="#111" stroke-width="1.8" stroke-linejoin="round" />
          <path :d="shapes(b.kind, i).inner" :fill="`url(#dots${i})`" />
        </g>
      </svg>
      <span :style="{ color: b.ink, fontSize: (b.text.length > 11 ? 34 : b.text.length > 8 ? 38 : 42) + 'px' }">{{ b.text }}!</span>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');
/* grey sunburst rays from the middle, on a pale page */
.comic { position: absolute; inset: 0; overflow: hidden;
  background: repeating-conic-gradient(from 0deg at 50% 52%, #d9d9d9 0deg 6deg, #f4f4f4 6deg 12deg); }
.burst { position: absolute; aspect-ratio: 1.6; transform: translate(-50%, -50%) rotate(var(--rot)) scale(0);
  animation: pop 0.35s cubic-bezier(.22, 1, .36, 1) forwards; }
.burst svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(5px 6px 0 rgb(0 0 0 / 0.35)); }
.burst span { position: absolute; inset: 0; display: grid; place-items: center; padding: 0 20%; text-align: center;
  font: 400 42px/0.92 Bangers, sans-serif; letter-spacing: 0.03em; transform: skewX(-8deg);
  -webkit-text-stroke: 2px #111; paint-order: stroke fill;
  text-shadow: 1px 1px 0 #111, 2px 2px 0 #111, 3px 3px 0 #111, 4px 4px 0 #111; }
@keyframes pop { to { transform: translate(-50%, -50%) rotate(var(--rot)) scale(1); } }
</style>
