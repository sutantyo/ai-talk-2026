<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { theme } from '../theme'
// After the COMP1010 graph: the words you pick up as you learn, filling the slide in waves. First-year words appear
// with the slide, near the middle; each click adds the next level further out.
// Pass the slide's $clicks as `step`. Each word takes the most central free spot, so the cloud packs tightly and
// each level wraps around the one before.
defineProps<{ step: number }>()

const LEVELS = [
  ['variable', 'if', 'else', 'for', 'while', 'function', 'parameter', 'return', 'array', 'string', 'recursion',
    'boolean', 'class', 'scope', 'index', 'loop', 'print', 'integer'],
  ['API', 'object', 'compiler', 'assembly', 'pointer', 'stack', 'heap', 'memory', 'hashmap', 'list', 'tree', 'graph', 'Big-O',
    'sorting', 'search', 'inheritance', 'interface', 'polymorphism', 'exception', 'testing', 'Git', 'HTTP', 'JSON',
    'HTML', 'thread', 'process', 'queue', 'files'],
  ['lambda', 'closure', 'patterns', 'concurrency', 'deadlock', 'mutex', 'caching', 'SQL', 'transactions', 'REST',
    'async', 'generics', 'types', 'regex', 'injection', 'distributed', 'encryption', 'authentication', 'refactoring',
    'CI/CD', 'containers', 'indexing', 'immutability', 'events', 'microservices', 'coroutines', 'monads', 'serialisation'],
]
// Font size range per level, slide pixels: wide, and skewed small, so a few words stand out in each level.
const SIZES = [[16, 64], [12, 40], [10, 26]]
// One hue per level (first year yellow, second coral, then lavender); each word gets its own shade of it, darker
// on the light theme and lighter on the dark one, so every shade stays readable.
const HUES = [85, 30, 285]
const colour = (w: Word) => theme.value === 'pastel'
  ? `oklch(${(0.42 + w.shade * 0.24).toFixed(3)} ${(0.11 + w.shade * 0.05).toFixed(3)} ${HUES[w.level]})`
  : `oklch(${(0.64 + w.shade * 0.28).toFixed(3)} ${(0.1 + w.shade * 0.07).toFixed(3)} ${HUES[w.level]})`

interface Word { text: string, level: number, size: number, x: number, y: number, delay: number, shade: number }
const words = ref<Word[]>([])

// A small seeded random, so the cloud comes out the same every time.
let seed = 7
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

onMounted(async () => {
  await document.fonts.load('800 30px Nunito')
  const ctx = document.createElement('canvas').getContext('2d')!
  const placed: { l: number, t: number, r: number, b: number }[] = []
  const out: Word[] = []
  // Candidate spots on a 4px grid, most central first (distance measured on an ellipse the shape of the slide),
  // with a little jitter so the cloud doesn't look machine-made.
  const CX = 490, CY = 248, spots: { x: number, y: number, d: number }[] = []
  for (let x = 24; x <= 956; x += 4) for (let y = 18; y <= 476; y += 4)
    spots.push({ x, y, d: Math.hypot((x - CX) / 1.9, y - CY) + rand() * 26 })
  spots.sort((a, b) => a.d - b.d)
  LEVELS.forEach((list, level) => {
    const [lo, hi] = SIZES[level]
    // Biggest first, so the big words of a level get the central spots; except the first year, placed in shuffled
    // order, so its big and small words mix in the middle instead of the big ones clumping together.
    const sized = list.map(text => ({ text, size: Math.round(lo + rand() ** 2.2 * (hi - lo)), k: rand() }))
      .sort((a, b) => (level === 0 ? a.k - b.k : b.size - a.size))
    sized.forEach(({ text, size: start }, i) => {
      // try the word at its size; if no spot fits, shrink it a little and try again
      for (let size = start; size >= 10; size -= 2) {
        ctx.font = `800 ${size}px Nunito`
        const w = ctx.measureText(text).width + 4, h = size * 0.9
        for (const { x, y } of spots) {
          const box = { l: x - w / 2, t: y - h / 2, r: x + w / 2, b: y + h / 2 }
          if (box.l < 20 || box.r > 960 || box.t < 14 || box.b > 480) continue
          if (placed.some(p => box.l < p.r && box.r > p.l && box.t < p.b && box.b > p.t)) continue
          placed.push(box)
          out.push({ text, level, size, x, y, delay: (i % 12) * 0.05, shade: rand() })
          return
        }
      }
    })
  })
  words.value = out
})
</script>

<template>
  <div class="cloud" :class="'s' + Math.min(step, 2)">
    <span v-for="w in words" :key="w.text" class="w" :class="'lv' + w.level"
      :style="{ left: w.x + 'px', top: w.y + 'px', fontSize: w.size + 'px', color: colour(w), transitionDelay: w.delay + 's' }">{{ w.text }}</span>
  </div>
</template>

<style scoped>
.cloud { position: absolute; inset: 0; }
.w { position: absolute; transform: translate(-50%, -50%) scale(0.6); white-space: nowrap; font-weight: 800; line-height: 1;
  opacity: 0; transition: opacity 0.4s, transform 0.5s cubic-bezier(.22, 1, .36, 1); }
.cloud .lv0, .s1 .lv1, .s2 .lv1, .s2 .lv2 { opacity: 1; transform: translate(-50%, -50%) scale(1); }

</style>
