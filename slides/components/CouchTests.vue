<script setup lang="ts">
// Couch's real tests (mcp-demo/server/src/**/*.test.ts), for the Testing section. `view` picks a page:
// 'groups' (all 260, grouped by what they protect) and 'basic' (one video pasted ten ways, and five things to refuse).
// Counts and names from a run on 2026-11-03: 18 files, 260 tests, all passing, about 5 seconds.
defineProps<{ view: 'groups' | 'basic' }>()

const GROUPS = [
  { name: 'Keeping strangers out', what: 'Google sign-in, the allowed emails, sessions, Claude\'s access', n: 141, colour: '#e4202a' },
  { name: 'Reading YouTube and Facebook', what: 'links, pages and feeds; spotting Shorts', n: 51, colour: '#1f5fbf' },
  { name: 'Starting up safely', what: 'refusing to start with missing or wrong settings', n: 39, colour: '#ff7a1a' },
  { name: 'Speaking Claude\'s language', what: 'the MCP message format', n: 18, colour: '#22b8e8' },
  { name: 'Couch\'s rules, end to end', what: 'the whole thing, working together', n: 11, colour: '#e83e9b' },
]
// youtube.test.ts, parseYouTubeId: every way to paste one video must give its id, and anything else must be refused.
// Word for word from the tests (the id is Rick Astley's "Never Gonna Give You Up").
const SAME = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123',
  'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ?si=abc',
  'youtu.be/dQw4w9WgXcQ',
  'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'https://www.youtube.com/live/dQw4w9WgXcQ?feature=share',
  'dQw4w9WgXcQ',
  '  dQw4w9WgXcQ  ',
]
const REFUSE = [
  'https://vimeo.com/123456789',
  'https://www.youtube.com/@RickAstleyYT',
  'https://www.youtube.com/watch?v=short',
  'https://evil.example/watch?v=dQw4w9WgXcQ',
  'not a link at all',
]
</script>

<template>
  <div class="tests">
    <template v-if="view === 'groups'">
      <div class="cap">Couch: 260 tests, about 5 seconds</div>
      <div class="panel">
        <div v-for="g in GROUPS" :key="g.name" class="row">
          <div class="label"><b>{{ g.name }}</b><span>{{ g.what }}</span></div>
          <div class="bar"><i :style="{ width: (g.n / 141 * 100) + '%', background: g.colour }" /><em>{{ g.n }}</em></div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="cap">One video, ten ways to paste it</div>
      <div class="links">
        <div class="panel same">
          <div v-for="l in SAME" :key="l" class="l"><code>{{ l.replace(/ /g, '·') }}</code><span>→</span></div>
        </div>
        <div class="panel one"><span class="tick">✓</span>the same<br>video</div>
      </div>
      <div class="panel refuse">
        <span class="h">…and five it must refuse:</span>
        <span v-for="l in REFUSE" :key="l" class="l"><span class="no">✗</span><code>{{ l }}</code></span>
      </div>
    </template>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');
.tests { position: absolute; inset: 0; padding: 30px 56px;
  background: repeating-conic-gradient(from 0deg at 50% 52%, #d9d9d9 0deg 6deg, #f4f4f4 6deg 12deg); }
.cap { display: inline-block; padding: 8px 22px; background: #ffd400; border: 3px solid #111; box-shadow: 6px 6px 0 #111;
  transform: rotate(-1.5deg); font: 400 40px/1 Bangers, sans-serif; letter-spacing: 0.03em; color: #111; }
.panel { margin-top: 26px; padding: 22px 28px; background: #fff; border: 3px solid #111; box-shadow: 8px 8px 0 #111; }
.row { display: grid; grid-template-columns: 400px 1fr; align-items: center; gap: 20px; margin: 9px 0; }
.label b { display: block; font: 800 22px/1.15 Nunito, sans-serif; color: #111; }
.label span { display: block; font: 600 14px/1.25 Nunito, sans-serif; color: #555; }
.bar { display: flex; align-items: center; gap: 10px; }
.bar i { display: block; height: 34px; border: 2.5px solid #111; }
.bar em { font: 400 32px Bangers, sans-serif; font-style: normal; color: #111; }
.links { display: flex; gap: 22px; margin-top: 18px; align-items: center; }
.links .panel, .refuse.panel { margin-top: 0; padding: 10px 16px; }
.tests code { font: 500 14.5px/1.5 'Fira Code', ui-monospace, monospace; font-variant-ligatures: none; color: #222; background: none; padding: 0; white-space: pre; }
.same .l { display: flex; justify-content: space-between; gap: 14px; }
.same .l span { font: 900 17px Nunito, sans-serif; color: #1fae4b; }
.one { flex: none; display: flex; align-items: center; gap: 12px; font: 400 36px/1 Bangers, sans-serif; letter-spacing: 0.03em; color: #111;
  background: #e9f9ee !important; transform: rotate(-2deg); }
.tick { display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: #1fae4b;
  border: 2.5px solid #111; font: 900 20px Nunito, sans-serif; color: #fff; }
.refuse.panel { margin-top: 18px; display: flex; flex-wrap: wrap; column-gap: 22px; row-gap: 2px; align-items: baseline; }
.refuse .h { font: 400 20px Bangers, sans-serif; letter-spacing: 0.03em; color: #555; }
.refuse .l { display: inline-flex; gap: 6px; align-items: baseline; }
.refuse code { font-size: 13px; color: #666; }
.no { font: 900 14px Nunito, sans-serif; color: #e4202a; }
</style>
