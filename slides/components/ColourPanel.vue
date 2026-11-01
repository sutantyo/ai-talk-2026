<script setup lang="ts">
import { computed, ref } from 'vue'
import { panelOpen, theme, THEMES, tuning, TUNINGS } from '../theme'

// Sliders for the numbers behind the current theme (style.css), for trying colours live on the slides.
// Opened with C. "Copy values" puts the numbers on the clipboard to paste back
// into style.css once a look is chosen.
const copied = ref(false)
const sliders = computed(() => TUNINGS[theme.value])
const name = computed(() => THEMES.find(t => t.id === theme.value)?.name)
const text = computed(() => sliders.value.map(t => `--${t.id}: ${tuning.value[t.id]};`).join('\n'))

function reset() {
  for (const t of sliders.value) tuning.value[t.id] = t.value
}

async function copy() {
  try { await navigator.clipboard.writeText(text.value) } catch { return }
  copied.value = true
  setTimeout(() => { copied.value = false }, 1400)
}
</script>

<template>
  <div v-if="panelOpen" class="colour-panel" @keydown.stop>
    <div class="head">
      <span>Colours: {{ name }}</span>
      <button title="Close (C)" @click="panelOpen = false">×</button>
    </div>
    <label v-for="t in sliders" :key="t.id">
      <span class="name">{{ t.label }} <b>{{ tuning[t.id] }}</b></span>
      <input v-model.number="tuning[t.id]" type="range" :min="t.min" :max="t.max" :step="t.step">
    </label>
    <div class="actions">
      <button @click="reset">Reset</button>
      <button @click="copy">{{ copied ? 'Copied' : 'Copy values' }}</button>
    </div>
  </div>
</template>

<style scoped>
.colour-panel { position: absolute; left: 16px; bottom: 14px; z-index: 20; width: 300px; padding: 10px 14px 12px;
  border-radius: 10px; background: var(--surface); border: 1px solid var(--line); color: var(--ink);
  box-shadow: 0 8px 24px rgba(var(--shadow), 0.35); font-size: 12.5px; user-select: none; }
.head { display: flex; justify-content: space-between; align-items: center; font-weight: 800; margin-bottom: 6px; }
.head button { font: inherit; font-size: 18px; line-height: 1; color: var(--muted); background: none; border: none;
  cursor: pointer; }
label { display: block; margin: 6px 0; }
.name { display: flex; justify-content: space-between; color: var(--soft); }
.name b { color: var(--orange); font-weight: 700; }
input { width: 100%; accent-color: var(--orange); }
.actions { display: flex; gap: 8px; margin-top: 10px; }
.actions button { flex: 1; font: inherit; font-weight: 700; padding: 5px 10px; border-radius: 999px; cursor: pointer;
  border: 1.5px solid var(--orange); color: var(--orange); background: transparent; }
.actions button:hover { background: var(--orange); color: var(--on-sub); }
</style>
