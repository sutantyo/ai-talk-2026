<script setup lang="ts">
import { ref } from 'vue'

// A prompt to type into Claude (Wordle slide): a small terminal window in the slide font, with a Copy button.
// Slidev turns off text selection on slides, so the button is the reliable way to grab the prompt on stage;
// the text is also made selectable as a fallback.
const text = ref<HTMLElement | null>(null)
const copied = ref(false)

async function copy() {
  const prompt = text.value?.innerText.trim() ?? ''
  try {
    await navigator.clipboard.writeText(prompt)
  } catch {
    // No clipboard API (e.g. a page opened from a file): fall back to a hidden text area.
    const area = document.createElement('textarea')
    area.value = prompt
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  copied.value = true
  setTimeout(() => { copied.value = false }, 1600)
}
</script>

<template>
  <div class="prompt-card">
    <div class="prompt-bar">
      <span>claude</span>
      <button class="copy" :class="{ done: copied }" @click.stop="copy">{{ copied ? 'Copied' : 'Copy' }}</button>
    </div>
    <p><span class="prompt-mark">&gt;</span><span ref="text" class="prompt-text"><slot /></span></p>
  </div>
</template>

<style scoped>
.prompt-bar { display: flex; align-items: center; justify-content: space-between; }
.copy { font: inherit; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.03em; padding: 3px 12px;
  border-radius: 999px; border: 1.5px solid var(--term-muted); color: var(--term-muted); background: transparent; cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s; }
.copy:hover { background: var(--term-muted); color: var(--term-bar); }
.copy.done { border-color: var(--orange); background: var(--orange); color: var(--on-sub); }
.prompt-text { user-select: text; -webkit-user-select: text; cursor: text; }
</style>
