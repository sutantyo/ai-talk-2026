<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNav } from '@slidev/client'
import { deadEnd, deadEndAt, lastClicks, lastSlideNo, lastTopic, TOPICS, useTopicSlides, visited } from './topics'
import { nextTheme, theme, THEMES } from './theme'
import ColourPanel from './components/ColourPanel.vue'

// Drawn on top of every slide. It:
// - records which topic you're in (for the hub's filled dots and lit trunk),
// - marks sub-sections by switching the accent colour to orange (style.css),
// - shows the section name bottom-left and small "Theme" and "Map" buttons bottom-right.
const { go, clicks, currentSlideNo, currentSlideRoute } = useNav()
const { currentTopic } = useTopicSlides()

const topic = computed(() => TOPICS.find(t => t.id === currentTopic.value) ?? null)
// "Claude Code · Skills" on a sub-section, with "Optional · " in front if it's optional.
const crumb = computed(() => {
  const t = topic.value
  if (!t) return ''
  const parent = TOPICS.find(p => p.id === t.parent)
  return [t.optional ? 'Optional' : '', parent?.title, t.title].filter(Boolean).join(' · ')
})

watch(currentTopic, id => {
  if (id) { visited.add(id); lastTopic.value = id }
}, { immediate: true })

watch(topic, t => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.topicKind = t?.kind ?? 'core'
}, { immediate: true })

const themeName = computed(() => THEMES.find(t => t.id === theme.value)?.name ?? '')

const onHub = computed(() => currentSlideRoute.value?.meta.slide?.frontmatter.routeAlias === 'hub')

// Remember the last slide outside the map (and how far into its reveals), so ← on the map can go back to it.
watch([currentSlideNo, clicks], ([no, c]) => {
  if (!onHub.value) { lastSlideNo.value = no; lastClicks.value = c }
}, { immediate: true })

// At a section's edge the keys do nothing; the Map button pulses and a note says why.
const nudging = ref(false)
let nudgeTimer: ReturnType<typeof setTimeout> | undefined
watch(deadEnd, () => {
  nudging.value = false
  requestAnimationFrame(() => { nudging.value = true })
  clearTimeout(nudgeTimer)
  nudgeTimer = setTimeout(() => { nudging.value = false }, 1600)
})
</script>

<template>
  <ColourPanel />

  <!-- section marker: the section's name, bottom left -->
  <div v-if="!onHub && topic" class="crumb">{{ crumb }}</div>

  <Transition name="note">
    <div v-if="nudging && !onHub" class="edge-note">{{ deadEndAt === 'end' ? 'End' : 'Start' }} of section · <kbd>H</kbd> for the map</div>
  </Transition>

  <button v-if="!onHub" class="theme-switch" :title="`Colours: ${themeName}. Switch (T)`" @click="nextTheme">
    <!-- a ring split in two halves: one theme, the other -->
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M10 2.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" />
    </svg>
    <span>{{ themeName }}</span>
  </button>

  <button v-if="!onHub" class="to-hub" :class="{ nudge: nudging }" title="Back to the map (H)" @click="go('hub')">
    <!-- a mini version of the hub tree: trunk, two branches, ring nodes -->
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <path d="M10 19V4M10 14H6L4 12M10 9h4l2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="10" cy="3" r="2.2" fill="var(--ring-fill)" stroke="currentColor" stroke-width="1.8" />
      <circle cx="3.5" cy="11.5" r="2" fill="var(--ring-fill)" stroke="var(--orange)" stroke-width="1.8" />
      <circle cx="16.5" cy="6.5" r="2" fill="var(--ring-fill)" stroke="var(--orange)" stroke-width="1.8" />
    </svg>
    <span>Map</span>
  </button>
</template>

<style scoped>
.crumb { position: absolute; left: 24px; bottom: 18px; z-index: 5; pointer-events: none;
  font-size: 11px; font-weight: 600; letter-spacing: 0.03em; color: var(--quiet); }

.to-hub, .theme-switch { position: absolute; right: 16px; bottom: 14px; z-index: 10; display: flex; align-items: center;
  gap: 6px; padding: 5px 11px 5px 9px; border: 1px solid var(--line); border-radius: 999px; background: var(--ring-fill);
  color: var(--teal); font-family: inherit; font-size: 13px; font-weight: 600; line-height: 1; letter-spacing: 0.02em;
  cursor: pointer; opacity: 0.6; transition: opacity 0.2s, background 0.2s, border-color 0.2s; }
.theme-switch { right: 100px; }
.to-hub:hover, .theme-switch:hover { opacity: 1; background: var(--code-bg); border-color: var(--teal); }
.to-hub:focus-visible, .theme-switch:focus-visible { opacity: 1; outline: 2px solid var(--orange); outline-offset: 2px; }
.to-hub.nudge { opacity: 1; border-color: var(--teal); animation: nudge 0.8s ease-out 2; }
@keyframes nudge { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--teal) 55%, transparent); }
  100% { box-shadow: 0 0 0 12px transparent; } }

.edge-note { position: absolute; right: 196px; bottom: 19px; z-index: 10; font-size: 13px; color: var(--quiet);
  pointer-events: none; }
.edge-note kbd { font: inherit; font-weight: 700; padding: 0 5px; border: 1px solid var(--line); border-radius: 4px;
  background: var(--bg); }
.note-enter-active, .note-leave-active { transition: opacity 0.25s, transform 0.25s; }
.note-enter-from, .note-leave-to { opacity: 0; transform: translateX(8px); }
</style>
