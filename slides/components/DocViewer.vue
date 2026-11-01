<script setup lang="ts">
import { nextTick, ref } from 'vue'

// A plain-text document (CLAUDE.md, a skill) in a scrollable window, with buttons that jump to and highlight
// a section. Used by ClaudeMdViewer.vue and SkillViewer.vue.
export interface DocSection {
  label: string
  // The section starts at the first line this matches and runs up to the next heading (or the end of the file).
  from: (line: string) => boolean
}
const props = defineProps<{ text: string, filename: string, sections: DocSection[], caption: string }>()

const lines = props.text.replace(/\n$/, '').split('\n')

function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
// Just enough Markdown to read like a document: headings, **bold**, `code` (which can wrap onto the next line),
// fenced blocks (shown in a code font, without their ``` lines), and a skill's header block between --- lines
// (field names in bold).
interface Line { html: string, kind: string }
const rendered: Line[] = []
let inFence = false
let inCode = false
let inFront = lines[0] === '---'
for (const [n, l] of lines.entries()) {
  if (inFront) {
    if (n > 0 && l === '---') inFront = false
    const html = escape(l).replace(/^([a-z-]+):/, '<b>$1:</b>')
    rendered.push({ html: html || '&nbsp;', kind: 'front' })
    continue
  }
  if (l.startsWith('```')) { inFence = !inFence; rendered.push({ html: '', kind: 'fence' }); continue }
  if (inFence) { rendered.push({ html: escape(l) || '&nbsp;', kind: 'pre' }); continue }
  const kind = l.startsWith('### ') ? 'head-3' : l.startsWith('## ') ? 'head-2' : l.startsWith('# ') ? 'head-1' : ''
  const html = escape(l).split('`').map((part, i) => {
    if (i > 0) inCode = !inCode
    return inCode ? `<code>${part}</code>` : part.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  }).join('')
  rendered.push({ html: html || '&nbsp;', kind: l.trim() ? kind : `${kind} blank` })
}

const isHeading = (l: string) => /^#{1,3} /.test(l)
const SECTIONS = props.sections.map((s) => {
  const line = lines.findIndex(s.from)
  const next = lines.findIndex((l, n) => n > line && isHeading(l))
  return { label: s.label, line, end: next < 0 ? lines.length : next }
})

const box = ref<HTMLElement | null>(null)
const lineEls = ref<HTMLElement[]>([])
const active = ref<number | null>(null)
async function jump(i: number) {
  active.value = i
  await nextTick()
  const el = lineEls.value[SECTIONS[i].line]
  if (box.value && el) box.value.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' })
}
function inActive(n: number) {
  if (active.value === null) return false
  const s = SECTIONS[active.value]
  return n >= s.line && n < s.end
}
</script>

<template>
  <div class="doc-viewer">
    <div class="window">
      <div class="tab">{{ filename }}</div>
      <div ref="box" class="doc" @wheel.stop>
        <div
          v-for="(l, n) in rendered" :key="n" ref="lineEls"
          class="line" :class="[l.kind, { hl: inActive(n) }]"
          v-html="l.html"
        />
      </div>
    </div>
    <div class="panel">
      <button
        v-for="(s, i) in SECTIONS" :key="s.label"
        :class="{ on: active === i }" :disabled="s.line < 0" @click="jump(i)"
      >{{ s.label }}</button>
      <p class="meta"><span class="num">{{ lines.length }}</span> lines of plain English</p>
      <p class="caption">{{ caption }}</p>
    </div>
  </div>
</template>

<style scoped>
.doc-viewer { display: flex; gap: 28px; align-items: stretch; margin-top: -14px; }
.window { flex: 1; min-width: 0; border: 2px solid var(--line); border-radius: 12px; background: var(--surface); overflow: hidden;
  display: flex; flex-direction: column; box-shadow: 0 6px 20px rgba(var(--shadow), 0.08); }
.tab { flex: none; padding: 6px 14px; font-size: 0.8rem; font-weight: 700; color: var(--deep); background: var(--surface-tab);
  border-bottom: 1px solid var(--line); }
.doc { position: relative; height: 318px; overflow-y: auto; padding: 10px 16px 14px; font-size: 0.68rem; line-height: 1.5; color: var(--soft);
  overscroll-behavior: contain; }
.line { white-space: pre-wrap; overflow-wrap: anywhere; padding: 0 6px; margin: 0 -6px; border-radius: 4px;
  transition: background 0.4s; }
.line.blank { line-height: 0.8; }
.line.fence { display: none; }
.line.pre { font-family: ui-monospace, Menlo, monospace; font-size: 0.9em; font-variant-ligatures: none; }
.line.front { color: var(--muted); }
.line.front :deep(b) { color: var(--orange); }
/* head-N, not hN: UnoCSS reads h1/h2/h3 as height utilities. */
.line.head-1 { font-size: 1.25rem; font-weight: 800; color: var(--deep); }
.line.head-2 { font-size: 1rem; font-weight: 800; color: var(--deep); margin-top: 4px; }
.line.head-3 { font-size: 0.85rem; font-weight: 800; color: var(--deep); }
.line :deep(b) { color: var(--deep); }
.line :deep(code) { font-family: ui-monospace, Menlo, monospace; font-size: 0.95em; color: var(--deep);
  background: var(--code-bg); padding: 0 0.25em; border-radius: 3px; font-variant-ligatures: none; }
.line.hl { background: var(--highlight); }

.panel { flex: none; width: 200px; display: flex; flex-direction: column; gap: 10px; }
.panel button { font: inherit; font-size: 0.92rem; font-weight: 700; padding: 8px 14px; border-radius: 999px;
  border: 2.5px solid var(--orange); color: var(--orange); background: transparent; cursor: pointer;
  transition: background 0.2s, color 0.2s; }
.panel button:hover:not(:disabled), .panel button.on { background: var(--orange); color: var(--on-sub); }
.panel button:disabled { opacity: 0.4; cursor: default; }
.meta { margin: 14px 0 0; display: flex; align-items: baseline; gap: 8px; font-size: 0.95rem; font-weight: 600;
  color: var(--deep); }
.meta .num { font-size: 2.6rem; font-weight: 800; color: var(--orange); line-height: 1; }
.caption { margin: 0; font-size: 0.85rem; color: var(--muted); }
</style>
