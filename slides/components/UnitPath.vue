<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
// The Interlude's "fundamentals" slide: a sentence with COMP1010 in it; on the first click COMP1010 leaves the
// sentence for the bottom of the slide and grows arrows up to the second-year units that need it; on the second,
// each of those grows edges further up, fading out with "…" (later units, not listed). Pass the slide's $clicks as `step`.
const props = defineProps<{ step: number }>()

const UNITS = [
  { code: 'COMP2010', name: 'Algorithms and Data Structures', x: 150 },
  { code: 'COMP2100', name: 'Systems Programming', x: 380 },
  { code: 'COMP2000', name: 'Object-Oriented Programming', x: 600 },
  { code: 'COMP2110', name: 'Web Technology', x: 830 },
]
// Later units (unlisted, shown as "…"), and which second-year units lead to each: some take one, some several, as
// real prerequisites do. Edges are [unit index, top index].
const TOPS = [{ x: 70, y: 128 }, { x: 190, y: 104 }, { x: 290, y: 134 }, { x: 420, y: 112 }, { x: 530, y: 138 },
  { x: 650, y: 106 }, { x: 760, y: 132 }, { x: 900, y: 116 }]
const EDGES = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [2, 5], [2, 6], [3, 5], [3, 6], [3, 7], [1, 1]]
const ROOT = { x: 490, y: 470 }, MID_Y = 300, TOP_Y = 120

// Where COMP1010 sits inside the sentence, in slide pixels. Measured from the rendered boxes (scaled), whenever the
// slide gets a size: Slidev lays out hidden slides at zero size, so a measurement on mount alone comes out wrong.
const wrap = ref<HTMLElement>(), slot = ref<HTMLElement>()
const inSentence = ref({ x: 490, y: 276 })
function measure() {
  const w = wrap.value?.getBoundingClientRect(), r = slot.value?.getBoundingClientRect()
  if (!w || !r || !w.width) return
  const k = 980 / w.width
  inSentence.value = { x: (r.left + r.width / 2 - w.left) * k, y: (r.top + r.height / 2 - w.top) * k }
}
let ro: ResizeObserver | undefined
onMounted(() => { ro = new ResizeObserver(measure); ro.observe(wrap.value!); measure() })
onBeforeUnmount(() => ro?.disconnect())
const chip = computed(() => (props.step >= 1 ? ROOT : inSentence.value))
</script>

<template>
  <div ref="wrap" class="path" :class="'s' + Math.min(step, 2)">
    <p class="sentence">In <span ref="slot" class="slot">COMP1010</span> you learn the basic language for talking to a computer.</p>

    <svg class="lines" viewBox="0 0 980 552" aria-hidden="true">
      <defs>
        <linearGradient id="fade-up" gradientUnits="userSpaceOnUse" x1="0" :y1="MID_Y - 30" x2="0" :y2="TOP_Y - 20">
          <stop offset="0" stop-color="var(--muted)" /><stop offset="1" stop-color="var(--muted)" stop-opacity="0.15" />
        </linearGradient>
      </defs>
      <path v-for="u in UNITS" :key="u.code" class="l1" :d="`M${ROOT.x} ${ROOT.y - 22} L${u.x} ${MID_Y + 30}`" pathLength="1" />
      <path v-for="[u, t] in EDGES" :key="u + '-' + t" class="l2" :d="`M${UNITS[u].x} ${MID_Y - 30} L${TOPS[t].x} ${TOPS[t].y}`" pathLength="1" />
      <text v-for="t in TOPS" :key="t.x" class="more" :x="t.x" :y="t.y - 8" text-anchor="middle">…</text>
    </svg>

    <div v-for="u in UNITS" :key="u.code" class="unit" :style="{ left: u.x + 'px', top: MID_Y + 'px' }">
      <b>{{ u.code }}</b><span>{{ u.name }}</span>
    </div>

    <div class="chip" :style="{ left: chip.x + 'px', top: chip.y + 'px' }">COMP1010</div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&display=swap');
.path { position: absolute; inset: 0; }
.sentence { position: absolute; left: 90px; right: 90px; top: 50%; transform: translateY(-50%); margin: 0;
  font: 500 46px/1.25 Newsreader, serif; color: var(--ink); transition: opacity 0.5s; }
.slot { visibility: hidden; font: 900 40px Nunito, sans-serif; padding: 0 14px; }
.s1 .sentence, .s2 .sentence { opacity: 0; }

.chip { position: absolute; transform: translate(-50%, -50%); padding: 4px 14px; border-radius: 10px;
  font: 900 40px/1.1 Nunito, sans-serif; color: var(--bg); background: var(--orange); white-space: nowrap;
  transition: left 0.9s cubic-bezier(.6,0,.2,1), top 0.9s cubic-bezier(.6,0,.2,1); }

.lines { position: absolute; inset: 0; width: 100%; height: 100%; }
.lines path { fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0;
  transition: stroke-dashoffset 0.6s ease-out, opacity 0.2s; }
.lines .l1 { stroke: var(--orange); }
.lines .l2 { stroke: url(#fade-up); }
.lines .more { font: 800 24px Nunito, sans-serif; fill: var(--muted); opacity: 0; transition: opacity 0.4s 0.5s; }
.s2 .more { opacity: 0.6; }
.s1 .l1, .s2 .l1 { stroke-dashoffset: 0; opacity: 1; transition-delay: 0.8s; }
.s2 .l2 { stroke-dashoffset: 0; opacity: 1; }

.unit { position: absolute; transform: translate(-50%, -50%); width: 190px; height: 74px; box-sizing: border-box;
  display: flex; flex-direction: column; justify-content: flex-start; padding: 7px 10px; border: 2px solid var(--teal);
  border-radius: 10px; background: var(--bg); text-align: center; opacity: 0; transition: opacity 0.5s 1.2s; }
.unit b { display: block; font: 900 22px Nunito, sans-serif; color: var(--teal); }
.unit span { display: block; margin-top: 2px; font: 600 13px/1.25 Nunito, sans-serif; color: var(--ink); }
.s1 .unit, .s2 .unit { opacity: 1; }
.s2 .unit { transition-delay: 0s; }

</style>
