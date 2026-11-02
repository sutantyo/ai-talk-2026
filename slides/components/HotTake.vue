<script setup lang="ts">
// The running gag: a full page "Hot Take #N", with the Hot Ones logo turned into HOT TAKE
// (public/hot-takes/hot-take-logo.svg). Put the take between the tags; an optional #note slot (wrap it in v-click to
// reveal it later) goes under it, and an optional #ps slot is a small aside in the bottom-right corner. Use it on a slide with `layout: full`, so no footer shows.
defineProps<{ no: number | string }>()
const base = import.meta.env.BASE_URL
</script>

<template>
  <div class="hot">
    <div class="sign">
      <img :src="base + 'hot-takes/hot-take-logo.svg'" alt="Hot Take">
      <div class="no">#{{ no }}</div>
    </div>
    <div class="body">
      <div class="take"><slot /></div>
      <div class="note"><slot name="note" /></div>
    </div>
    <div class="ps"><slot name="ps" /></div>
  </div>
</template>

<style scoped>
.hot { position: absolute; inset: 0; background: #000; display: grid; grid-template-columns: 380px 1fr; align-items: center; gap: 40px;
  padding: 0 60px 0 50px; }
.sign { position: relative; }
.sign img { width: 100%; display: block; filter: drop-shadow(0 0 6px rgb(255 206 0 / 0.35)); }
/* the number, in the logo's yellow neon tube */
.no { position: absolute; right: -6px; bottom: -62px; font: 900 64px/1 Nunito, sans-serif; color: transparent;
  -webkit-text-stroke: 3px #ffce00; filter: drop-shadow(0 0 6px rgb(255 206 0 / 0.35)); }
.take { font: 900 42px/1.12 Nunito, sans-serif; color: var(--ink); }
.ps { position: absolute; right: 40px; bottom: 28px; font: 600 14px Nunito, sans-serif; color: #ffce00; }
.note { margin-top: 18px; font: 600 24px Nunito, sans-serif; color: #ffce00; min-height: 1.3em; }
</style>
