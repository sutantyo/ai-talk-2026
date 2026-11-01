<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useNav } from '@slidev/client'
import { branchPath, lastTopic, TOPICS, TRUNK_Y, useTopicSlides, visited } from '../topics'
import type { Topic } from '../topics'

const W = 980
const H = 552
const { go } = useNav()
const { ranges } = useTopicSlides()

const core = TOPICS.filter(t => t.kind === 'core')
const subs = TOPICS.filter(t => t.kind === 'sub')
const byId = Object.fromEntries(TOPICS.map(t => [t.id, t]))
const start = Math.min(...core.map(t => t.x))
const end = Math.max(...core.map(t => t.x))

// The trunk lights up from the first main point to the furthest core topic visited so far.
const litX = computed(() => {
  const xs = core.filter(t => visited.has(t.id)).map(t => t.x)
  return xs.length ? Math.max(...xs) : null
})

// The tree grows once per session; after that it's just there.
const grown = ref(sessionStorageGet())
onMounted(() => setTimeout(() => { grown.value = true; sessionStorageSet() }, 2600))
function sessionStorageGet() { try { return sessionStorage.getItem('hub-grown') === '1' } catch { return false } }
function sessionStorageSet() { try { sessionStorage.setItem('hub-grown', '1') } catch {} }

const hovered = ref<string | null>(null)

// Sub-sections stay folded away until you hover their main point, then branch out below it.
// They stay out while the pointer is on the point, its traces or its sub-sections, and fold back 1.5 s after
// the pointer leaves, so there's time to reach them. Pointing at another main point switches straight away
// (openBranches replaces what's open).
const open = ref<string | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | undefined
function openBranches(id: string) { clearTimeout(closeTimer); open.value = id }
function closeSoon() { clearTimeout(closeTimer); closeTimer = setTimeout(() => { open.value = null }, 1500) }

// Details card: sub-sections only (main points just grow and open their branches).
const hoveredTopic = computed(() => (hovered.value && byId[hovered.value].kind === 'sub' ? byId[hovered.value] : null))

function slidesIn(id: string) {
  const n = ranges.value.find(r => r.id === id)?.count
  return n ? `${n} slide${n > 1 ? 's' : ''}` : ''
}
function meta(t: Topic) {
  const part = t.parent ? `${t.optional ? 'Optional · part' : 'Part'} of ${byId[t.parent].title}` : ''
  return [t.kind === 'core' ? (t.minutes ? `~${t.minutes} min` : '') : part, slidesIn(t.id)]
    .filter(Boolean).join(' · ')
}
</script>

<template>
  <div class="hub" :class="{ grown }">
    <svg :viewBox="`0 0 ${W} ${H}`" class="tree" aria-label="Talk map">
      <defs>
        <!-- sized from the whole picture: a straight horizontal line has zero height, which would hide it -->
        <filter id="glow" filterUnits="userSpaceOnUse" :x="0" :y="0" :width="W" :height="H">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>


      <!-- sub-sections: folded away until you hover their main point, then they radiate out.
           Drawn first, so the orange always sits underneath the trunk and the talking points. -->
      <g
        v-for="t in subs" :key="'b' + t.id"
        class="branch-group" :class="{ open: open === t.parent, visited: visited.has(t.id), hl: hovered === t.id }"
        @mouseenter="openBranches(t.parent!)" @mouseleave="closeSoon"
      >
        <!-- optional: a thin dashed halo, drawn under the line so the line meets a solid ring -->
        <circle v-if="t.optional" :cx="t.x" :cy="t.y" r="19" class="halo" :style="{ transformOrigin: `${t.x}px ${t.y}px` }" />
        <path :d="branchPath(t)" class="branch-hit" />
        <path :d="branchPath(t)" pathLength="1" class="branch" />
        <g
          class="node sub" :class="{ 'is-optional': t.optional, visited: visited.has(t.id), here: lastTopic === t.id, hover: hovered === t.id }"
          tabindex="0" role="link" :aria-label="t.title"
          @mouseenter="hovered = t.id" @mouseleave="hovered = null"
          @focus="openBranches(t.parent!); hovered = t.id" @blur="hovered = null; closeSoon()"
          @click="go(t.alias)" @keydown.enter="go(t.alias)"
        >
          <circle :cx="t.x" :cy="t.y" r="26" class="hit" />
          <g class="pop" :style="{ transformOrigin: `${t.x}px ${t.y}px` }">
            <circle :cx="t.x" :cy="t.y" r="12" class="ripple" />
            <g class="dot" :style="{ transformOrigin: `${t.x}px ${t.y}px` }">
              <circle :cx="t.x" :cy="t.y" r="12" pathLength="1" class="ring" />
              <circle :cx="t.x" :cy="t.y" r="8" class="inner" />
              <circle :cx="t.x" :cy="t.y" r="11.5" class="inner rim" />
              <circle :cx="t.x" :cy="t.y" r="5" class="core-dot" />
            </g>
          </g>
          <text :x="t.x" :y="t.y + (t.optional ? 41 : 33)" text-anchor="middle" class="label opt-label">{{ t.title }}</text>
        </g>
      </g>

      <!-- the sub-section under the pointer: its whole branch, from the trunk, lit up on top of the others
           (which share its first stretch). It runs to the node's centre, and the node's middle (dark disc, thin
           circles, dot) is drawn again on top, so the line is cut off cleanly at the disc's edge. -->
      <template v-if="hoveredTopic && open === hoveredTopic.parent">
        <path :key="'hl' + hoveredTopic.id" :d="branchPath(hoveredTopic)" pathLength="1" class="branch-hl" filter="url(#glow)" />
        <g :key="'hc' + hoveredTopic.id" class="hl-cap" :class="{ visited: visited.has(hoveredTopic.id) }">
          <circle :cx="hoveredTopic.x" :cy="hoveredTopic.y" r="12" class="cap-disc" />
          <circle :cx="hoveredTopic.x" :cy="hoveredTopic.y" r="11.5" class="cap-line rim" />
          <circle :cx="hoveredTopic.x" :cy="hoveredTopic.y" r="8" class="cap-line" />
          <circle :cx="hoveredTopic.x" :cy="hoveredTopic.y" r="5" class="cap-dot" />
        </g>
      </template>

      <!-- the trunk: the core talk -->
      <path :d="`M ${start} ${TRUNK_Y} H ${end}`" pathLength="1" class="trace trunk" />
      <path v-if="litX !== null" :d="`M ${start} ${TRUNK_Y} H ${litX}`" class="lit" filter="url(#glow)" />

      <!-- the talking points -->
      <g
        v-for="(t, i) in core" :key="t.id"
        class="node core" :class="{ minor: t.minor, visited: visited.has(t.id), here: lastTopic === t.id, hover: hovered === t.id }"
        :style="{ animationDelay: `${0.3 + i * 0.12}s` }"
        tabindex="0" role="link" :aria-label="t.title"
        @mouseenter="hovered = t.id; openBranches(t.id)" @mouseleave="hovered = null; closeSoon()"
        @focus="hovered = t.id; openBranches(t.id)" @blur="hovered = null; closeSoon()"
        @click="go(t.alias)" @keydown.enter="go(t.alias)"
      >
        <circle :cx="t.x" :cy="t.y" r="26" class="hit" />
        <g class="dot" :style="{ transformOrigin: `${t.x}px ${t.y}px` }">
          <circle :cx="t.x" :cy="t.y" :r="t.minor ? 9 : 15" class="ring" />
          <circle :cx="t.x" :cy="t.y" :r="t.minor ? 3.5 : 6" class="core-dot" />
        </g>
        <text :x="t.x" :y="t.y - (t.minor ? 22 : 30)" text-anchor="middle" class="label core-label">{{ t.title }}</text>
      </g>
    </svg>

    <!-- details of whatever you're pointing at, in the top-right corner, clear of the tree -->
    <Transition name="card">
      <div v-if="hoveredTopic" :key="hoveredTopic.id" class="card" :class="hoveredTopic.kind">
        <div class="card-title">{{ hoveredTopic.title }}</div>
        <div class="card-teaser">{{ hoveredTopic.teaser }}</div>
        <div class="card-meta">{{ meta(hoveredTopic) }}</div>
      </div>
    </Transition>

    <div class="title">Coding ≠ Typing</div>
    <div class="hint">Press <kbd>H</kbd> to return here</div>
  </div>
</template>

<style scoped>
.hub {
  --trunk: var(--map-trunk); --core: var(--teal); --sub: var(--orange); --lit: var(--map-lit);
  --ring-fill: var(--map-bg);
  position: absolute; inset: 0; background: radial-gradient(circle at 50% 60%, var(--map-glow) 0%, var(--map-bg) 70%);
  font-family: inherit;
}
.tree { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }


.trace { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1;
  animation: draw 0.9s ease-out forwards; }
.trunk { stroke: var(--trunk); stroke-width: 9; animation-duration: 1.1s; }
.branch { fill: none; stroke: var(--sub); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0; transition: stroke-dashoffset 0.2s ease-in, opacity 0.2s; }
/* opacity 0 while folded: Safari still paints a round cap for the zero-length dash, leaving a stray dot. */
.branch-hit { fill: none; stroke: transparent; stroke-width: 26; }
.branch-group .pop { transform-box: view-box; transform: scale(0); transition: transform 0.15s ease-in, opacity 0.2s; }
.branch-group .opt-label { opacity: 0; transition: opacity 0.12s; }
.ripple { fill: none; stroke: var(--sub); stroke-width: 3; opacity: 0; transform-box: fill-box; transform-origin: center; }

/* Radiating out: the trace draws from the trunk, then the dot pops in with a ripple, then the label. */
.branch-group.open .branch { stroke-dashoffset: 0; opacity: 1; transition: stroke-dashoffset 0.45s cubic-bezier(0.2, 0.7, 0.3, 1); }
.branch-group.open .pop { transform: scale(1); opacity: 1; transition: transform 0.32s cubic-bezier(0.3, 1.6, 0.5, 1) 0.36s; }
.branch-group.open .ripple { animation: ripple 0.7s ease-out 0.42s; }
.branch-group.open .opt-label { opacity: 1; transition: opacity 0.25s 0.5s; }

/* Folded-away sub-sections can't be hovered or clicked. */
.branch-group:not(.open) .node,
.branch-group:not(.open) .branch-hit { pointer-events: none; }
/* The hovered sub-section: its path runs from the trunk in the highlight colour, and the node turns with it. */
/* The node's middle, drawn over the line's end; it shows up as the line arrives. */
.hl-cap { pointer-events: none; opacity: 0; animation: appear 0.1s ease-out 0.3s forwards; }
.cap-disc { fill: var(--ring-fill); }
.cap-line { fill: none; stroke: var(--map-hl); stroke-width: 1.6; }
.cap-dot { fill: var(--map-hl); }
/* The still ring on the disc's edge, thicker than the one around the dot (r 10.1 to 12.9); the spinning ring grows
   outwards to match, so its visible band stays about as wide. */
.rim, .inner.rim { stroke-width: 2.8; }
.hl-cap.visited .cap-disc { fill: var(--map-hl); }
.hl-cap.visited .cap-dot, .hl-cap.visited .cap-line { fill: none; stroke: var(--on-sub); }
.hl-cap.visited .cap-dot { fill: var(--on-sub); stroke: none; }
.branch-hl { fill: none; stroke: var(--map-hl); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1; stroke-dashoffset: 1; pointer-events: none; animation: draw 0.35s ease-out forwards; }
.node.sub.hover .ring, .node.sub.hover .ripple { stroke: var(--map-hl); }
.node.sub.hover .core-dot { color: var(--map-hl); }
.node.visited.sub.hover .ring { fill: var(--map-hl); }
.node.sub.hover .label { fill: var(--map-hl); }
/* ...once the green line has reached it (the line takes 0.35 s); going back is immediate. */
.node.sub.hover .ring, .node.sub.hover .core-dot, .node.sub.hover .label {
  transition: stroke 0.15s 0.3s, fill 0.15s 0.3s, color 0.15s 0.3s; }
/* The node glows like its line, from the same moment. */
.node.sub .ring { filter: drop-shadow(0 0 0 transparent); }
.node.sub.hover .ring { filter: drop-shadow(0 0 5px var(--map-hl)); transition: stroke 0.15s 0.3s, fill 0.15s 0.3s, filter 0.15s 0.3s, stroke-dasharray 0.2s 0.3s; }
.lit { stroke: var(--lit); stroke-width: 4; fill: none; stroke-linecap: round; }

.node { cursor: pointer; outline: none; opacity: 0; animation: appear 0.35s ease-out forwards; }
.hit { fill: transparent; }
.dot { transform-box: view-box; transition: transform 0.2s cubic-bezier(0.3, 1.6, 0.5, 1); }
.node.hover .dot { transform: scale(1.45); }
.ring { fill: var(--ring-fill); stroke-width: 5; }
.core .ring { stroke: var(--core); }
.sub .ring { stroke: var(--sub); }
.halo { fill: none; stroke: var(--sub); stroke-width: 2; stroke-dasharray: 3 3.6; transform-box: view-box;
  transform: scale(0); transition: transform 0.15s ease-in, opacity 0.2s; }
.branch-group.open .halo { transform: scale(1); transition: transform 0.32s cubic-bezier(0.3, 1.6, 0.5, 1) 0.4s; }
.core-dot { fill: currentColor; }
.core .core-dot { color: var(--core); }
.sub .core-dot { color: var(--sub); }
.node.visited.core .ring { fill: var(--core); }
.node.visited.sub .ring { fill: var(--sub); }
/* A visited main point lights up like the trunk: its centre turns the same white as the lit line. */
.node.visited.core .core-dot { fill: var(--lit); }
.node.visited.sub .core-dot { fill: var(--on-sub); }
.node.here .ring { animation: pulse 1.6s ease-in-out infinite; }

.label { fill: var(--ink); font-weight: 700; transition: fill 0.2s; }
.core-label { font-size: 21px; }
.minor .core-label { font-size: 16px; }
.opt-label { font-size: 15px; font-weight: 600; fill: var(--map-opt-label); }
.node.hover .label { fill: var(--map-hover); }
/* A sub-section under the pointer: its ring opens a gap and spins (staying the same size), so it's clear what a
   click will open. The gap opens with the colour change, once the highlighted line has arrived. */
.node.sub .ring { stroke-dasharray: 1 0; }
.node.sub.hover .ring { stroke-dasharray: 0.78 0.22; stroke-width: 6.5; }
.node.sub.hover .dot { animation: spin 1.6s linear infinite; }
/* Inside the spinning ring, two thin closed circles: one on the edge of the dark disc, where the line meets it through
   the gap (so the line doesn't stop dead), and one around the centre dot. */
.inner { fill: none; stroke: var(--map-hl); stroke-width: 1.6; opacity: 0; transition: opacity 0.1s; }
.node.sub.hover .inner { opacity: 1; transition: opacity 0.15s 0.3s; }
/* The node's own branch turns too, once the highlighted line has arrived, so no yellow shows through the gap. */
.branch-group.hl .branch { stroke: var(--map-hl);
  transition: stroke-dashoffset 0.45s cubic-bezier(0.2, 0.7, 0.3, 1), opacity 0.2s, stroke 0.1s 0.3s; }

.grown .trace { animation: none; stroke-dashoffset: 0; }
.grown .node { animation: none; opacity: 1; }

.card { position: absolute; top: 22px; right: 26px; width: 270px; padding: 10px 14px; border-radius: 10px; background: var(--map-card);
  box-shadow: 0 8px 24px rgba(var(--shadow), 0.18); border-top: 4px solid var(--core); pointer-events: none; z-index: 2; }
.card.sub { border-top-color: var(--map-hl); }
.card-title { font-weight: 700; font-size: 16px; color: var(--ink); }
.card-teaser { font-size: 13.5px; line-height: 1.35; color: var(--soft); margin-top: 3px; }
.card-meta { font-size: 12px; color: var(--muted); margin-top: 6px; }
.card-enter-active, .card-leave-active { transition: opacity 0.15s, margin-top 0.15s; }
.card-enter-from, .card-leave-to { opacity: 0; margin-top: -6px; }

.title { position: absolute; left: 32px; top: 24px; font-size: 26px; font-weight: 800; color: var(--deep);
  letter-spacing: 0.01em; }
.hint { position: absolute; right: 32px; bottom: 18px; font-size: 12.5px; color: var(--map-hint); }
kbd { font: inherit; font-weight: 700; padding: 0 5px; border: 1px solid var(--map-base); border-radius: 4px; background: var(--map-bg); }

@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes appear { from { opacity: 0; } to { opacity: 1; } }
@keyframes ripple { from { opacity: 0.8; transform: scale(1); } to { opacity: 0; transform: scale(2.6); } }
@keyframes pulse { 0%, 100% { stroke-opacity: 1; } 50% { stroke-opacity: 0.35; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
