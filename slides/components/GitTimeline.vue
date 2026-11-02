<script setup lang="ts">
// Source Control: a straight Git history, eight real commits from this deck's own repo (git log, 2026-11-03),
// messages shortened with "…" where long. Labels alternate above and below the line.
const COMMITS = [
  { hash: 'f3213a3', date: '25 Sep', msg: 'Interactive prototype of the AI & ML foundations lecture' },
  { hash: 'f221ef9', date: '6 Oct', msg: 'Remove the machine learning deck; repurpose the repo for the Coding ≠ Typing talk' },
  { hash: 'b29fc0b', date: '6 Oct', msg: 'Decide on Wordle as the demo project…' },
  { hash: '2a91e4d', date: '6 Oct', msg: 'Add the hub: a circuit-tree map of the talk…' },
  { hash: '970d594', date: '7 Oct', msg: 'Beyond Coding rework, … Learning backwards graph…' },
  { hash: '4877136', date: '8 Oct', msg: 'Rework the Claude Code section…' },
  { hash: '4b7c2b0', date: '2 Nov', msg: 'Add mcp-demo: a website changed only through Claude, via MCP' },
  { hash: 'b324dd7', date: '2 Nov', msg: "Skills: use Couch's add-to-couch skill instead of the phrasebook" },
]
</script>

<template>
  <div class="tl">
    <h2>sutantyo/ai-talk-2026 <span>· this deck's own history</span></h2>
    <div class="track">
      <div class="line" />
      <div v-for="(c, i) in COMMITS" :key="c.hash" class="c" :class="[i % 2 ? 'down' : 'up', { head: i === COMMITS.length - 1 }]"
        :style="{ left: (8 + i * (84 / (COMMITS.length - 1))) + '%' }">
        <div class="dot" />
        <div class="label">
          <div class="meta"><code>{{ c.hash }}</code> · {{ c.date }}</div>
          <div class="msg">{{ c.msg }}</div>
          <div v-if="i === COMMITS.length - 1" class="you">↑ you are here</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tl { position: absolute; inset: 0; padding: 30px 34px; }
h2 { margin: 0; font: 800 30px/1 Nunito, sans-serif; color: var(--deep); }
h2 span { font-weight: 600; font-size: 20px; color: var(--muted); }
.track { position: absolute; left: 34px; right: 34px; top: 52%; height: 0; }
.line { position: absolute; left: 0; right: 0; top: -2px; height: 4px; border-radius: 2px; background: var(--teal); }
.c { position: absolute; top: 0; width: 0; }
.dot { position: absolute; left: -11px; top: -11px; width: 22px; height: 22px; border-radius: 50%; background: var(--bg);
  border: 4px solid var(--teal); box-sizing: border-box; }
.head .dot { background: var(--orange); border-color: var(--orange); box-shadow: 0 0 0 6px color-mix(in srgb, var(--orange) 30%, transparent); }
.label { position: absolute; left: -76px; width: 152px; text-align: center; }
.up .label { bottom: 26px; }
.down .label { top: 26px; }
/* a tick from the dot to its label */
.c::before { content: ''; position: absolute; left: -1px; width: 2px; height: 16px; background: var(--line); }
.up::before { bottom: 11px; }
.down::before { top: 11px; }
.meta { font: 700 13px Nunito, sans-serif; color: var(--muted); }
.meta code { font: 600 13px 'Fira Code', monospace; color: var(--orange); background: none; padding: 0; }
.msg { margin-top: 3px; font: 600 14px/1.25 Nunito, sans-serif; color: var(--ink); }
.you { margin-top: 6px; font: 800 15px Nunito, sans-serif; color: var(--orange); }
</style>
