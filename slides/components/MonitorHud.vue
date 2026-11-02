<script setup lang="ts">
// The Monitoring section as a mission-control screen. The log is flight-watch's real logs/app.log (a stretch of it,
// word for word, scrolling on a loop); the counts are for the whole file (130 lines) as of 2026-11-03.
const LOG = [
  '03:06:34 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:06:34 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:06:39 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:06:39 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:11:16 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:11:16 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:11:39 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:11:39 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:13:29 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:13:29 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:13:38 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:13:38 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:13:54 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:13:54 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:13:54 ERROR flight lookup for QF25 failed: adsbdb status 503 (adsbdb returned 503)',
  '03:14:03 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:14:03 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:14:03 ERROR flight lookup for QF25 failed: adsbdb status 503 (adsbdb returned 503)',
  '03:16:30 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:16:30 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:16:30 ERROR flight lookup for QF25 failed: adsbdb status 503 (adsbdb returned 503)',
  '03:16:43 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:16:43 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:16:43 ERROR flight lookup for QF25 failed: adsbdb status 503 (adsbdb returned 503)',
  '03:16:56 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:16:56 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:16:57 ERROR flight lookup for QF25 failed: adsbdb status 503 (adsbdb returned 503)',
  '03:17:07 INFO  Flight Watch running at http://localhost:3200',
  '03:17:08 INFO  sigmets: fetched 140 items',
  '03:19:14 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:19:14 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:19:14 ERROR flight lookup for QF25 failed: adsbdb status 503 (adsbdb returned 503)',
  '03:19:52 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:19:52 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:19:52 ERROR flight lookup for QF25 failed: adsbdb status 503 (adsbdb returned 503)',
  '03:20:57 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:20:57 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:20:57 ERROR flight lookup for QF25 failed: adsbdb status 503 (adsbdb returned 503)',
  '03:21:42 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:21:42 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:21:43 ERROR flight lookup for QF25 failed: adsbdb status 503 (adsbdb returned 503)',
  '03:21:51 INFO  adsbdb has no route for QFA6 (404: unknown callsign)',
  '03:21:51 INFO  adsbdb has no route for QF1 (400: invalid callsign: QF1)',
  '03:21:51 ERROR flight lookup for QF25 failed: adsbdb status 503 (adsbdb returned 503)',
]
const COUNTS = [{ level: 'INFO', n: 96 }, { level: 'WARN', n: 2 }, { level: 'ERROR', n: 32 }]
const level = (l: string) => (l.includes(' ERROR ') ? 'err' : l.includes(' WARN ') ? 'warn' : 'info')
</script>

<template>
  <div class="hud">
    <header>
      <h2>Monitoring</h2>
      <span class="live"><i />live</span>
      <span class="src">flight-watch · logs/app.log</span>
    </header>
    <div class="body">
      <div class="term">
        <div class="scroll">
          <div v-for="(l, i) in [...LOG, ...LOG]" :key="i" class="ln" :class="level(l)">{{ l }}</div>
        </div>
      </div>
      <aside>
        <div class="counts">
          <div v-for="c in COUNTS" :key="c.level" class="c" :class="c.level.toLowerCase()"><b>{{ c.n }}</b><span>{{ c.level }}</span></div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=JetBrains+Mono:wght@500&display=swap');
.hud { position: absolute; inset: 0; padding: 26px 34px; color: #bdf6ff; overflow: hidden;
  background:
    linear-gradient(rgb(0 229 255 / 0.06) 1px, transparent 1px) 0 0 / 28px 28px,
    linear-gradient(90deg, rgb(0 229 255 / 0.06) 1px, transparent 1px) 0 0 / 28px 28px,
    radial-gradient(120% 90% at 50% 40%, #0a1a2e, #03070f 75%); }
/* faint CRT scanlines over everything */
.hud::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(transparent 0 2px, rgb(0 0 0 / 0.18) 2px 3px); }
header { display: flex; align-items: baseline; gap: 18px; padding-bottom: 10px; border-bottom: 1px solid rgb(0 229 255 / 0.35); }
h2 { margin: 0; font: 800 40px/1 Orbitron, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #6ff3ff;
  text-shadow: 0 0 12px rgb(0 229 255 / 0.7); }
.live { display: flex; align-items: center; gap: 7px; font: 600 14px Orbitron, sans-serif; letter-spacing: 0.2em; text-transform: uppercase; color: #ff5470; }
.live i { width: 10px; height: 10px; border-radius: 50%; background: #ff5470; box-shadow: 0 0 10px #ff5470; animation: blink 1.2s infinite; }
.src { margin-left: auto; font: 500 14px 'JetBrains Mono', monospace; color: rgb(189 246 255 / 0.6); }
.body { display: grid; grid-template-columns: 1fr 250px; gap: 24px; margin-top: 18px; height: calc(100% - 70px); }
.term { position: relative; overflow: hidden; border: 1px solid rgb(0 229 255 / 0.4); background: rgb(0 10 20 / 0.6);
  box-shadow: inset 0 0 30px rgb(0 229 255 / 0.12), 0 0 18px rgb(0 229 255 / 0.15); padding: 10px 14px;
  mask-image: linear-gradient(transparent, #000 12%, #000 88%, transparent); }
.scroll { animation: roll 40s linear infinite; }
.ln { font: 500 13.5px/1.55 'JetBrains Mono', monospace; white-space: nowrap; color: #8fe9f5; }
.ln.warn { color: #ffc24b; }
.ln.err { color: #ff5470; text-shadow: 0 0 8px rgb(255 84 112 / 0.6); }
aside { display: flex; flex-direction: column; gap: 22px; }
.counts { display: grid; gap: 10px; }
.c { display: flex; align-items: baseline; justify-content: space-between; padding: 8px 14px; border: 1px solid rgb(0 229 255 / 0.4);
  background: rgb(0 229 255 / 0.05); }
.c b { font: 800 34px/1 Orbitron, sans-serif; }
.c span { font: 600 13px Orbitron, sans-serif; letter-spacing: 0.2em; }
.c.info { color: #6ff3ff; } .c.warn { color: #ffc24b; } .c.error { color: #ff5470; }
.c.error b { text-shadow: 0 0 12px rgb(255 84 112 / 0.7); }
@keyframes roll { to { transform: translateY(-50%); } }
@keyframes blink { 50% { opacity: 0.25; } }
</style>
