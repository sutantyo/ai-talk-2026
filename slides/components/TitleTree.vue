<script setup lang="ts">
// Decoration for the title slide: the map's circuit style, shaped to sit in the bottom-right corner.
// The trunk is an L: it starts at a green node top-right, runs down the right side, turns at the corner and runs
// left along the bottom. Green nodes sit on the trunk (the main points); orange branches grow inwards and upwards
// into the open space. Fixed drawing, not generated from topics.ts.

const trunk = 'M 480 26 V 236 L 436 280 H 130'

const greens: [number, number][] = [[480, 26], [480, 118], [480, 210], [330, 280], [130, 280]]

// Each branch: path from a green node, and the node it ends in. `dashed` adds the optional-style dashed halo.
const branches: { d: string, end: [number, number], dashed?: boolean }[] = [
  { d: 'M 480 118 L 452 90 H 360 L 330 60', end: [330, 60] },
  { d: 'M 480 118 L 452 146 H 400', end: [400, 146] },
  { d: 'M 480 210 L 452 182 H 290 L 254 146', end: [254, 146], dashed: true },
  { d: 'M 330 280 L 302 252 H 210 L 180 222', end: [180, 222] },
  { d: 'M 330 280 L 358 252 V 230', end: [358, 230] },
  { d: 'M 130 280 L 102 252 V 180', end: [102, 180] },
]
</script>

<template>
  <svg class="title-tree" viewBox="70 0 440 310" aria-hidden="true">
    <!-- optional-style halos first, then branches, so lines pass over the halo and meet a solid ring -->
    <circle v-for="(b, i) in branches.filter(b => b.dashed)" :key="'h' + i" :cx="b.end[0]" :cy="b.end[1]" r="17"
      class="halo node" :style="{ animationDelay: '1.5s' }" />
    <!-- branches next, so the orange sits underneath the trunk -->
    <path v-for="(b, i) in branches" :key="'b' + i" :d="b.d" pathLength="1" class="trace branch"
      :style="{ animationDelay: `${0.7 + i * 0.12}s` }" />
    <path :d="trunk" pathLength="1" class="trace trunk" />
    <g v-for="(b, i) in branches" :key="'o' + i" class="node sub" :class="{ dashed: b.dashed }"
      :style="{ animationDelay: `${1.2 + i * 0.1}s` }">
      <circle :cx="b.end[0]" :cy="b.end[1]" r="11" class="ring" />
      <circle :cx="b.end[0]" :cy="b.end[1]" r="4.5" class="pip" />
    </g>
    <g v-for="(g, i) in greens" :key="'g' + i" class="node core" :style="{ animationDelay: `${0.2 + i * 0.15}s` }">
      <circle :cx="g[0]" :cy="g[1]" r="14" class="ring" />
      <circle :cx="g[0]" :cy="g[1]" r="5.5" class="pip" />
    </g>
  </svg>
</template>

<style scoped>
/* Bottom-right, clear of the title block in the top-left. */
.title-tree { position: absolute; right: 22px; bottom: 18px; width: 50%; height: auto; overflow: visible; }
.trace { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1;
  animation: draw 1s ease-out forwards; }
.trunk { stroke: var(--map-trunk); stroke-width: 9; animation-duration: 1.4s; }
.branch { stroke: var(--orange); stroke-width: 4; opacity: 0.85; }
.node { opacity: 0; animation: appear 0.35s ease-out forwards; }
.ring { fill: var(--ring-fill); stroke-width: 5; }
.core .ring { stroke: var(--teal); }
.sub .ring { stroke: var(--orange); }
.halo { fill: none; stroke: var(--orange); stroke-width: 2; stroke-dasharray: 3 3.6; }
.core .pip { fill: var(--teal); }
.sub .pip { fill: var(--orange); }
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes appear { to { opacity: 1; } }
</style>
