<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

// A book as a dependency graph: each chapter needs the chapters it points up to.
// "Read it like a book" walks it breadth-first, tier by tier, until it reaches the goal.
// "Work backwards" starts at the goal and jumps back to only the few chapters you actually need.
interface Chapter { n: number, x: number, y: number, needs: number[] }

const TIER = [34, 124, 214, 304]
const CHAPTERS: Chapter[] = [
  { n: 1, x: 120, y: TIER[0], needs: [] },
  { n: 2, x: 300, y: TIER[0], needs: [] },
  { n: 3, x: 500, y: TIER[0], needs: [] },
  { n: 4, x: 60, y: TIER[1], needs: [1] },
  { n: 5, x: 220, y: TIER[1], needs: [2] },
  { n: 6, x: 380, y: TIER[1], needs: [2] },
  { n: 7, x: 540, y: TIER[1], needs: [2, 3] },
  { n: 8, x: 100, y: TIER[2], needs: [4, 5] },
  { n: 9, x: 250, y: TIER[2], needs: [5] },
  { n: 10, x: 420, y: TIER[2], needs: [6, 7] },
  { n: 11, x: 570, y: TIER[2], needs: [7] },
  { n: 12, x: 80, y: TIER[3], needs: [8] },
  { n: 13, x: 300, y: TIER[3], needs: [9, 10] },
  { n: 14, x: 470, y: TIER[3], needs: [10, 11] },
  { n: 15, x: 600, y: TIER[3], needs: [11] },
]
const GOAL = 13
// Working backwards: the one thing I want is in chapter 13; it only leans on part of 10, which leans on part of 7.
const BACKWARDS = [13, 10, 7]

const byN = Object.fromEntries(CHAPTERS.map(c => [c.n, c]))
const edges = CHAPTERS.flatMap(c => c.needs.map(p => ({ from: p, to: c.n, key: `${p}-${c.n}` })))

// Breadth-first from the chapters that need nothing: a chapter is read once everything it needs has been read.
function bookOrder(goal: number) {
  const read = new Set<number>()
  const order: number[] = []
  let queue = CHAPTERS.filter(c => c.needs.length === 0).map(c => c.n)
  while (queue.length) {
    const next: number[] = []
    for (const n of queue) {
      if (read.has(n)) continue
      read.add(n)
      order.push(n)
      if (n === goal) return order
      for (const c of CHAPTERS)
        if (c.needs.includes(n) && c.needs.every(p => read.has(p)) && !read.has(c.n)) next.push(c.n)
    }
    queue = next.sort((a, b) => a - b)
  }
  return order
}

const mode = ref<'idle' | 'book' | 'back'>('idle')
const lit = ref<number[]>([])
const running = ref(false)
let timers: ReturnType<typeof setTimeout>[] = []
function clearTimers() { timers.forEach(clearTimeout); timers = [] }
onUnmounted(clearTimers)

function play(kind: 'book' | 'back') {
  clearTimers()
  mode.value = kind
  lit.value = []
  running.value = true
  const steps = kind === 'book' ? bookOrder(GOAL) : BACKWARDS
  const gap = kind === 'book' ? 380 : 750
  steps.forEach((n, i) => timers.push(setTimeout(() => { lit.value = [...lit.value, n] }, 300 + i * gap)))
  timers.push(setTimeout(() => { running.value = false }, 300 + steps.length * gap))
}
function reset() { clearTimers(); mode.value = 'idle'; lit.value = []; running.value = false }

const litSet = computed(() => new Set(lit.value))
// Book: an edge lights when the chapter it leads to is read. Backwards: only the jumps along the chosen path.
function edgeLit(e: { from: number, to: number }) {
  if (mode.value === 'book') return litSet.value.has(e.to)
  if (mode.value === 'back') {
    const i = BACKWARDS.indexOf(e.to)
    return i >= 0 && BACKWARDS[i + 1] === e.from && litSet.value.has(e.from)
  }
  return false
}
const count = computed(() => lit.value.length)
const caption = computed(() => {
  if (mode.value === 'book') return count.value === bookOrder(GOAL).length && !running.value
    ? 'every chapter before it, just to reach chapter 13' : 'reading in order…'
  if (mode.value === 'back') return !running.value ? 'only the parts I need, nothing else' : 'working backwards…'
  return 'I want one thing from chapter 13'
})
</script>

<template>
  <div class="learning" :class="mode">
    <svg viewBox="0 0 660 340" class="graph" aria-label="Chapters of a book and what each one needs">
      <path
        v-for="e in edges" :key="e.key"
        :d="`M ${byN[e.from].x} ${byN[e.from].y} L ${byN[e.to].x} ${byN[e.to].y}`"
        class="edge" :class="{ lit: edgeLit(e) }"
      />
      <g
        v-for="c in CHAPTERS" :key="c.n" class="chapter"
        :class="{ lit: litSet.has(c.n), goal: c.n === GOAL, skipped: mode !== 'idle' && !running && !litSet.has(c.n) }"
      >
        <circle :cx="c.x" :cy="c.y" r="19" />
        <text :x="c.x" :y="c.y + 0.5">{{ c.n }}</text>
      </g>
      <text :x="byN[GOAL].x" :y="byN[GOAL].y + 34" class="goal-label">the goal</text>
    </svg>

    <div class="panel">
      <button class="book" :disabled="running" @click="play('book')">Read it like a book</button>
      <button class="back" :disabled="running" @click="play('back')">Work backwards</button>
      <div class="count">
        <span class="num">{{ count }}</span>
        <span class="unit">chapter{{ count === 1 ? '' : 's' }} read</span>
      </div>
      <p class="caption">{{ caption }}</p>
      <button class="reset" :disabled="mode === 'idle'" @click="reset">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.learning { display: flex; align-items: center; gap: 28px; margin-top: -12px; }
.graph { width: 640px; flex: none; overflow: visible; }

.edge { stroke: var(--graph-edge); stroke-width: 3; stroke-linecap: round; transition: stroke 0.3s, stroke-width 0.3s; }
.book .edge.lit { stroke: var(--teal); stroke-width: 4; }
.back .edge.lit { stroke: var(--orange); stroke-width: 5; }

.chapter circle { fill: var(--ring-fill); stroke: var(--graph-ring); stroke-width: 3; transition: fill 0.3s, stroke 0.3s; }
.chapter text { font-size: 15px; font-weight: 700; fill: var(--muted); text-anchor: middle; dominant-baseline: middle;
  transition: fill 0.3s; }
.chapter.goal circle { stroke: var(--orange); stroke-dasharray: 5 4; }
.chapter.goal text { fill: var(--orange); }
.book .chapter.lit circle { fill: var(--teal); stroke: var(--teal); stroke-dasharray: none; }
.back .chapter.lit circle { fill: var(--orange); stroke: var(--orange); stroke-dasharray: none; }
.book .chapter.lit text { fill: var(--on-core); }
.back .chapter.lit text { fill: var(--on-sub); }
/* Skipped chapters fade by colour, not opacity: their white fill must stay solid so the lines don't show through. */
.chapter.skipped circle { stroke: var(--graph-skip-ring); }
.chapter.skipped text { fill: var(--graph-skip-text); }
.chapter { transform-box: fill-box; transform-origin: center; }
.chapter.lit { animation: pop 0.35s ease-out; }
@keyframes pop { 50% { transform: scale(1.18); } }
.goal-label { font-size: 12px; font-weight: 600; fill: var(--orange); text-anchor: middle; }

.panel { display: flex; flex-direction: column; align-items: stretch; gap: 10px; width: 220px; }
.panel button { font: inherit; font-size: 0.95rem; font-weight: 700; padding: 9px 14px; border-radius: 999px;
  border: 2.5px solid; background: transparent; cursor: pointer; transition: background 0.2s, color 0.2s, opacity 0.2s; }
.panel button.book { color: var(--teal); border-color: var(--teal); }
.panel button.book:hover:not(:disabled) { background: var(--teal); color: var(--on-core); }
.panel button.back { color: var(--orange); border-color: var(--orange); }
.panel button.back:hover:not(:disabled) { background: var(--orange); color: var(--on-sub); }
.panel button:disabled { opacity: 0.45; cursor: default; }
.panel button.reset { align-self: center; border: none; background: transparent; padding: 4px 10px; font-size: 0.8rem; color: var(--muted); }
.count { display: flex; align-items: baseline; gap: 8px; margin-top: 14px; color: var(--deep); }
.count .num { font-size: 3.2rem; font-weight: 800; line-height: 1; }
.book .count .num { color: var(--teal); }
.back .count .num { color: var(--orange); }
.count .unit { font-size: 1rem; font-weight: 600; }
.caption { margin: 0; min-height: 2.6em; font-size: 0.9rem; color: var(--muted); }
</style>
